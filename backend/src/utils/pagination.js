// Clamps page/pageSize query params into safe integers for direct
// interpolation into LIMIT/OFFSET. Always coerced through parseInt() and
// clamped here — never raw user input reaching the SQL string.
function parsePagination(query, { defaultPageSize = 20, maxPageSize = 100 } = {}) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(query.pageSize, 10) || defaultPageSize, 1), maxPageSize);
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}

module.exports = { parsePagination };
