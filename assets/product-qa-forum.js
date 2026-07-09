(() => {
  const sections = document.querySelectorAll('[data-product-qa-forum]');

  if (!sections.length) return;

  const text = (value, fallback = '') => {
    if (value === null || value === undefined) return fallback;
    return String(value);
  };

  const formatDate = (value) => {
    if (!value) return '';

    const date = new Date(value.replace(' ', 'T'));

    if (Number.isNaN(date.getTime())) return text(value);

    return date.toISOString().slice(0, 10);
  };

  const buildUrl = (handle, suffix = '') => `/apps/product-qa/products/${encodeURIComponent(handle)}${suffix}`;

  const setEmpty = (tbody, message) => {
    tbody.innerHTML = '';

    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.className = 'product-qa-forum__empty';
    cell.colSpan = 6;
    cell.textContent = message;
    row.appendChild(cell);
    tbody.appendChild(row);
  };

  const renderRows = (section, posts) => {
    const tbody = section.querySelector('[data-product-qa-rows]');
    const handle = section.dataset.productHandle;
    const productTitle = section.dataset.productTitle;

    tbody.innerHTML = '';

    posts.forEach((post) => {
      const row = document.createElement('tr');
      const postUrl = buildUrl(handle, `/posts/${encodeURIComponent(post.id)}`);

      const cells = [
        ['product-qa-forum__no', text(post.id)],
        ['product-qa-forum__product', text(post.product_title, productTitle)],
        ['product-qa-forum__post-title', ''],
        ['product-qa-forum__author', text(post.posted_by, 'Guest')],
        ['product-qa-forum__date product-qa-forum__muted', formatDate(post.created_at)],
        ['product-qa-forum__view product-qa-forum__muted', text(post.view_count, '0')]
      ];

      cells.forEach(([className, value], index) => {
        const cell = document.createElement('td');
        cell.className = className;

        if (index === 2) {
          const link = document.createElement('a');
          link.href = postUrl;
          link.textContent = text(post.title, 'Untitled');
          cell.appendChild(link);
        } else {
          cell.textContent = value;
        }

        row.appendChild(cell);
      });

      tbody.appendChild(row);
    });
  };

  sections.forEach(async (section) => {
    const handle = section.dataset.productHandle;
    const productId = section.dataset.productId;
    const productTitle = section.dataset.productTitle;
    const productUrl = section.dataset.productUrl;
    const limit = section.dataset.listLimit || '8';
    const tbody = section.querySelector('[data-product-qa-rows]');
    const askLink = section.querySelector('[data-product-qa-ask]');
    const listLink = section.querySelector('[data-product-qa-list]');

    const listUrl = buildUrl(handle);
    const askUrl = `${buildUrl(handle, '/ask')}?product_id=${encodeURIComponent(productId)}&product_title=${encodeURIComponent(productTitle)}&return_to=${encodeURIComponent(productUrl)}`;

    if (askLink) askLink.href = askUrl;
    if (listLink) listLink.href = listUrl;

    try {
      const response = await fetch(`${listUrl}?format=json&limit=${encodeURIComponent(limit)}`, {
        headers: { Accept: 'application/json' }
      });

      if (!response.ok) throw new Error(`Q&A request failed: ${response.status}`);

      const payload = await response.json();
      const posts = Array.isArray(payload.data) ? payload.data : [];

      if (!posts.length) {
        setEmpty(tbody, section.dataset.emptyText || 'No posts yet.');
        return;
      }

      renderRows(section, posts);
    } catch (error) {
      setEmpty(tbody, section.dataset.errorText || 'Q&A posts are temporarily unavailable.');
    }
  });
})();
