#!/usr/bin/env python3
"""
Zero-infrastructure document index: SQLite FTS5 (built-in BM25 ranking, ships
in Python's stdlib sqlite3 on virtually all modern builds) as the primary
lexical retrieval backend, with an automatic pure-Python TF-IDF fallback for
the rare Python build without FTS5 compiled in. No vector database, no
embedding model, no external service -- this is the generalization away from
SupplyChain-AI's Chroma + HuggingFace-embeddings stack.
"""
import math
import re
import sqlite3
from collections import Counter
from pathlib import Path
from typing import Optional

from records import content_hash, metadata_to_json, validate_record

_TOKEN_RE = re.compile(r"\w+", re.UNICODE)

# Common English function words dropped from QUERY terms only (never from indexed
# document text) -- without this, a short chunk that happens to repeat "is"/"the"/
# "which" can out-rank a longer, actually-relevant document under plain BM25/TF-IDF.
_QUERY_STOPWORDS = frozenset("""
a an the is are was were be been being do does did what which who whom this that
these those of to in on for with at by from as it its i you he she we they
""".split())


def _tokenize(text: str) -> list:
    return [t.lower() for t in _TOKEN_RE.findall(text or "")]


def _tokenize_query(text: str) -> list:
    tokens = [t for t in _tokenize(text) if t not in _QUERY_STOPWORDS]
    return tokens if tokens else _tokenize(text)  # don't empty out an all-stopword query


class IndexStore:
    """
    Wraps one SQLite database file. Tries to create an FTS5 virtual table;
    falls back to a plain table + in-Python scoring if FTS5 isn't available
    in this Python build (sqlite3.OperationalError on CREATE VIRTUAL TABLE).
    """

    def __init__(self, db_path, force_fallback: bool = False):
        self.db_path = str(db_path)
        self.conn = sqlite3.connect(self.db_path)
        self.conn.row_factory = sqlite3.Row
        self.fts5_available = False if force_fallback else self._try_create_fts5()
        if not self.fts5_available:
            self._create_fallback_table()
        self._check_mode_consistency()

    def _row_count_if_exists(self, table: str) -> int:
        try:
            return self.conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        except sqlite3.OperationalError:
            return 0

    def _check_mode_consistency(self):
        """
        FTS5 mode and fallback mode store records in different tables
        (documents_fts vs. documents) within the same database file. If this
        DB was built in one mode and is now being opened in the other -- e.g.
        a mismatched --force-fallback flag, or a Python build whose FTS5
        availability differs from when the index was created -- querying the
        active table would silently return zero results while real data sits
        in the other table, unqueried. Fail loudly instead: an empty result
        set here must mean "no matches", never "wrong table".
        """
        active_table = "documents_fts" if self.fts5_available else "documents"
        other_table = "documents" if self.fts5_available else "documents_fts"
        if self._row_count_if_exists(active_table) == 0 and self._row_count_if_exists(other_table) > 0:
            raise RuntimeError(
                f"{self.db_path}: this index was built in "
                f"{'fallback' if self.fts5_available else 'FTS5'} mode ('{other_table}' has records), "
                f"but is being opened in {'FTS5' if self.fts5_available else 'fallback'} mode "
                f"('{active_table}' is empty). Re-open with a consistent --force-fallback setting, "
                "or delete this index file and re-ingest."
            )

    def _try_create_fts5(self) -> bool:
        try:
            self.conn.execute(
                """
                CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
                    doc_id UNINDEXED,
                    source_path UNINDEXED,
                    source_type UNINDEXED,
                    title,
                    date UNINDEXED,
                    text,
                    metadata_json UNINDEXED,
                    tokenize = 'porter unicode61'
                )
                """
            )
            self.conn.commit()
            return True
        except sqlite3.OperationalError:
            return False

    def _create_fallback_table(self):
        self.conn.execute(
            """
            CREATE TABLE IF NOT EXISTS documents (
                doc_id TEXT PRIMARY KEY,
                source_path TEXT,
                source_type TEXT,
                title TEXT,
                date TEXT,
                text TEXT,
                metadata_json TEXT
            )
            """
        )
        self.conn.commit()

    # -- Ingestion -----------------------------------------------------

    def upsert(self, record: dict) -> str:
        """Insert or update one record. Returns 'inserted', 'updated', or 'unchanged'."""
        validate_record(record)
        existing_text = self._get_existing_text(record["doc_id"])
        if existing_text is not None and existing_text == record["text"]:
            return "unchanged"

        metadata_json = metadata_to_json(record["metadata"])
        if self.fts5_available:
            self.conn.execute("DELETE FROM documents_fts WHERE doc_id = ?", (record["doc_id"],))
            self.conn.execute(
                "INSERT INTO documents_fts (doc_id, source_path, source_type, title, date, text, metadata_json) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                (record["doc_id"], record["source_path"], record["source_type"], record["title"],
                 record["date"], record["text"], metadata_json),
            )
        else:
            self.conn.execute(
                "INSERT OR REPLACE INTO documents "
                "(doc_id, source_path, source_type, title, date, text, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (record["doc_id"], record["source_path"], record["source_type"], record["title"],
                 record["date"], record["text"], metadata_json),
            )
        self.conn.commit()
        return "updated" if existing_text is not None else "inserted"

    def upsert_many(self, records: list) -> dict:
        counts = {"inserted": 0, "updated": 0, "unchanged": 0}
        for record in records:
            counts[self.upsert(record)] += 1
        return counts

    def _get_existing_text(self, doc_id: str) -> Optional[str]:
        table = "documents_fts" if self.fts5_available else "documents"
        cur = self.conn.execute(f"SELECT text FROM {table} WHERE doc_id = ?", (doc_id,))
        row = cur.fetchone()
        return row["text"] if row else None

    # -- Retrieval -------------------------------------------------------

    def query(self, question: str, top_k: int = 5, source_type: Optional[str] = None) -> list:
        if self.fts5_available:
            return self._query_fts5(question, top_k, source_type)
        return self._query_fallback(question, top_k, source_type)

    def _query_fts5(self, question: str, top_k: int, source_type: Optional[str]) -> list:
        terms = _tokenize_query(question)
        if not terms:
            return []
        # OR of quoted terms: FTS5's unicode61 tokenizer already splits stored text on
        # non-alnum boundaries (so "PO-1002" is indexed as "po" + "1002"), so an OR of
        # individual query terms gives bag-of-words recall; bm25() then ranks by relevance.
        match_expr = " OR ".join(f'"{t}"' for t in terms)
        sql = (
            "SELECT doc_id, source_path, source_type, title, date, text, metadata_json, "
            "bm25(documents_fts) AS score FROM documents_fts WHERE documents_fts MATCH ?"
        )
        params = [match_expr]
        if source_type:
            sql += " AND source_type = ?"
            params.append(source_type)
        # bm25() in SQLite FTS5 returns a lower (more negative) value for a better match.
        sql += " ORDER BY score ASC LIMIT ?"
        params.append(top_k)
        rows = self.conn.execute(sql, params).fetchall()
        return [self._row_to_result(row, row["score"]) for row in rows]

    def _query_fallback(self, question: str, top_k: int, source_type: Optional[str]) -> list:
        terms = _tokenize_query(question)
        if not terms:
            return []
        sql = "SELECT * FROM documents"
        params = []
        if source_type:
            sql += " WHERE source_type = ?"
            params.append(source_type)
        rows = self.conn.execute(sql, params).fetchall()
        if not rows:
            return []

        doc_tokens = [_tokenize(f"{row['title']} {row['text']}") for row in rows]
        num_docs = len(rows)
        doc_freq = Counter()
        for tokens in doc_tokens:
            token_set = set(tokens)
            for term in terms:
                if term in token_set:
                    doc_freq[term] += 1

        scored = []
        for row, tokens in zip(rows, doc_tokens):
            if not tokens:
                continue
            term_counts = Counter(tokens)
            score = 0.0
            for term in terms:
                tf = term_counts.get(term, 0)
                if tf == 0:
                    continue
                idf = math.log((num_docs + 1) / (doc_freq[term] + 1)) + 1
                score += (tf / len(tokens)) * idf
            if score > 0:
                scored.append((row, -score))  # negate so "lower is better", matching the FTS5 convention

        scored.sort(key=lambda pair: pair[1])
        return [self._row_to_result(row, score) for row, score in scored[:top_k]]

    def _row_to_result(self, row, score) -> dict:
        import json
        return {
            "doc_id": row["doc_id"],
            "source_path": row["source_path"],
            "source_type": row["source_type"],
            "title": row["title"],
            "date": row["date"],
            "text": row["text"],
            "metadata": json.loads(row["metadata_json"]) if row["metadata_json"] else {},
            "score": score,
        }

    # -- Audit -------------------------------------------------------------

    def coverage(self) -> list:
        """Return per (source_path, source_type) record counts and date range, for the audit use case."""
        table = "documents_fts" if self.fts5_available else "documents"
        sql = (
            f"SELECT source_path, source_type, COUNT(*) AS num_records, "
            f"MIN(date) AS earliest_date, MAX(date) AS latest_date FROM {table} "
            f"GROUP BY source_path, source_type ORDER BY source_path"
        )
        return [dict(row) for row in self.conn.execute(sql).fetchall()]

    def count(self) -> int:
        table = "documents_fts" if self.fts5_available else "documents"
        return self.conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]

    def close(self):
        self.conn.close()
