const EOF_MARK = /%%EOF/g;
const FONT_OBJ = /\/Type\s*\/Font\b|\/Font\s*<</;
const ANNOT_SUBTYPE = /\/Subtype\s*\/(FreeText|Stamp|Ink|Square|Circle|Line|Polygon|Text|Link|Widget|Highlight|Redact)\b/g;
const SIGNATURE = /\/Type\s*\/Sig\b|\/ByteRange/;
const FORM_OR_SIGNATURE = /\/Subtype\s*\/Widget\b|\/FT\s*\/Sig\b|\/Type\s*\/Sig\b|\/AcroForm/;
const PAGE_DEF = /\d+\s+\d+\s+obj\s*<<(?:(?!endobj)[\s\S])*?\/Type\s*\/Page\b(?:(?!endobj)[\s\S])*?endobj/g;
const OBJ_NUM = /(?:^|\s)(\d+)\s+\d+\s+obj\b/g;

function contentRefs(text) {
  const refs = new Set();
  for (const m of text.matchAll(/\/Contents\s+(\d+)\s+\d+\s+R/g)) refs.add(m[1]);
  for (const m of text.matchAll(/\/Contents\s*\[([^\]]*)\]/g)) {
    for (const r of m[1].matchAll(/(\d+)\s+\d+\s+R/g)) refs.add(r[1]);
  }
  return refs;
}

/**
 * Later incremental-save revisions and what each one changes.
 * Linearized ("fast web view") files carry an extra %%EOF that is not an edit.
 */
export function analyzeRevisions(bytes) {
  const text = new TextDecoder('latin1').decode(bytes);
  const linearized = text.slice(0, 2048).includes('/Linearized');
  const ends = [...text.matchAll(EOF_MARK)].map((m) => m.index + m[0].length);
  const baseEnd = linearized ? 1 : 0;
  if (ends.length <= baseEnd + 1) return { linearized, revisions: [] };

  const pageContentObjs = contentRefs(text.slice(0, ends[baseEnd]));
  const revisions = [];
  for (let i = baseEnd + 1; i < ends.length; i++) {
    const seg = text.slice(ends[i - 1], ends[i]);
    const redefined = [...seg.matchAll(OBJ_NUM)].map((m) => m[1]);
    // A page redefinition only matters if it points at content streams the original didn't have
    // (signatures and form fills redefine the page just to add /Annots).
    const newContentRefs = [...seg.matchAll(PAGE_DEF)].some((m) => [...contentRefs(m[0])].some((r) => !pageContentObjs.has(r)));
    const touchesPageContent = newContentRefs || redefined.some((n) => pageContentObjs.has(n));
    const formOrSignature = FORM_OR_SIGNATURE.test(seg);
    const addsFonts = FONT_OBJ.test(seg) && !formOrSignature; // field appearances legitimately add fonts
    const annotTypes = [...seg.matchAll(ANNOT_SUBTYPE)].map((m) => m[1]);
    const signatureOnly = SIGNATURE.test(seg) && !touchesPageContent && !addsFonts && annotTypes.every((t) => t === 'Widget');
    revisions.push({ touchesPageContent, addsFonts, annotTypes, signatureOnly, formOrSignature });
  }
  return { linearized, revisions };
}
