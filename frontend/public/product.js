/**
 * product.js
 * Shared JavaScript for all product-related pages:
 *   /product-management, /add-product, /edit-product,
 *   /search, /product-detail
 */

const API_ROOT = window.API_BASE_URL || 'http://localhost:3000/api';
const API_BASE = `${API_ROOT.replace(/\/$/, '')}/products`;
const token = localStorage.getItem('token');
const path = window.location.pathname;

// ── Auth Guard (admin pages only) ─────────────────────────────────────────────
if (['/product-management', '/add-product', '/edit-product'].includes(path)) {
    if (!token) window.location.href = '/login';
}

// ── Shared Helpers ────────────────────────────────────────────────────────────
function formatPrice(price) {
    return '฿' + parseFloat(price).toLocaleString('th-TH');
}

function placeholderImg() {
    return 'https://placehold.co/400x400/1e293b/94a3b8?text=No+Image';
}

function escAttr(str) {
    return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── Product Management (/product-management) ──────────────────────────────────
if (path === '/product-management') {

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = '/login';
    });

    let pm_step = 'types';
    let pm_type = '';
    let pm_brand = '';

    // ── Breadcrumb ──────────────────────────────────────────────────────────
    function renderPMBreadcrumb() {
        const bc = document.getElementById('pm-breadcrumb');
        let html = `<span class="crumb" id="bc-pm-all">สินค้าทั้งหมด</span>`;
        if (pm_step === 'brands' || pm_step === 'products') {
            html += ` <span class="separator">›</span>
                      <span class="crumb" id="bc-pm-type">${pm_type}</span>`;
        }
        if (pm_step === 'products') {
            html += ` <span class="separator">›</span> <span>${pm_brand}</span>`;
        }
        bc.innerHTML = html;
        bc.style.display = 'flex';

        document.getElementById('bc-pm-all').addEventListener('click', () => {
            pm_step = 'types'; pm_type = ''; pm_brand = '';
            loadPMTypes();
        });
        const typeEl = document.getElementById('bc-pm-type');
        if (typeEl) {
            typeEl.addEventListener('click', () => {
                pm_step = 'brands'; pm_brand = '';
                loadPMBrands();
            });
        }
    }

    // ── Step 1: Types ───────────────────────────────────────────────────────
    async function loadPMTypes() {
        renderPMBreadcrumb();
        const content = document.getElementById('pm-content');
        content.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem 0">กำลังโหลด...</p>';
        try {
            const res = await fetch(`${API_BASE}/types`);
            const types = await res.json();
            if (types.length === 0) {
                content.innerHTML = '<p style="text-align:center;color:var(--text-muted)">ยังไม่มีสินค้าในระบบ</p>';
                return;
            }
            content.innerHTML = `<div class="category-grid" id="pm-type-grid"></div>`;
            const grid = document.getElementById('pm-type-grid');
            types.forEach(t => {
                const card = document.createElement('div');
                card.className = 'category-card';
                card.dataset.type = t.type;
                card.innerHTML = `<h3>${t.type}</h3><p class="cat-count">${t.count} รายการ</p>`;
                card.addEventListener('click', () => {
                    pm_type = t.type;
                    pm_step = 'brands';
                    loadPMBrands();
                });
                grid.appendChild(card);
            });
        } catch (err) {
            content.innerHTML = '<p style="color:#ef4444;text-align:center">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
            console.error(err);
        }
    }

    // ── Step 2: Brands ──────────────────────────────────────────────────────
    async function loadPMBrands() {
        renderPMBreadcrumb();
        const content = document.getElementById('pm-content');
        content.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem 0">กำลังโหลด...</p>';
        try {
            const res = await fetch(`${API_BASE}/brands?type=${encodeURIComponent(pm_type)}`);
            const brands = await res.json();
            content.innerHTML = `<div class="category-grid" id="pm-brand-grid"></div>`;
            const grid = document.getElementById('pm-brand-grid');
            brands.forEach(b => {
                const card = document.createElement('div');
                card.className = 'category-card';
                card.innerHTML = `<h3>${b.brand}</h3><p class="cat-count">${b.count} รายการ</p>`;
                card.addEventListener('click', () => {
                    pm_brand = b.brand;
                    pm_step = 'products';
                    loadPMProducts();
                });
                grid.appendChild(card);
            });
        } catch (err) {
            content.innerHTML = '<p style="color:#ef4444;text-align:center">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
            console.error(err);
        }
    }

    // ── Step 3: Products Table ──────────────────────────────────────────────
    async function loadPMProducts() {
        renderPMBreadcrumb();
        const content = document.getElementById('pm-content');
        content.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem 0">กำลังโหลด...</p>';
        try {
            const res = await fetch(
                `${API_BASE}/search?type=${encodeURIComponent(pm_type)}&brand=${encodeURIComponent(pm_brand)}`
            );
            const products = await res.json();

            if (products.length === 0) {
                content.innerHTML = '<p style="text-align:center;color:var(--text-muted)">ไม่พบสินค้าในหมวดนี้</p>';
                return;
            }

            const tableHTML = `
                <div style="overflow-x:auto;">
                <table>
                    <thead>
                        <tr>
                            <th>รูปภาพ</th>
                            <th>หมวดหมู่</th>
                            <th>ยี่ห้อ</th>
                            <th>รหัสสินค้า</th>
                            <th>ชื่อสินค้า</th>
                            <th>ราคา</th>
                            <th>รายละเอียด</th>
                            <th>สถานะ</th>
                            <th>การจัดการ</th>
                        </tr>
                    </thead>
                    <tbody id="pm-tbody"></tbody>
                </table>
                </div>
            `;
            content.innerHTML = tableHTML;

            const tbody = document.getElementById('pm-tbody');
            products.forEach(p => {
                const tr = document.createElement('tr');
                tr.id = `row-${p.ProductID}`;
                tr.innerHTML = `
                    <td><img src="${p.image_url || placeholderImg()}" class="prod-img" alt="${escAttr(p.name)}"></td>
                    <td>${p.type}</td>
                    <td>${p.brand}</td>
                    <td style="color:var(--text-muted);font-size:0.8rem;">${p.ProductID}</td>
                    <td>${p.name}</td>
                    <td style="color:var(--accent-amber);font-weight:600;">${formatPrice(p.price)}</td>
                    <td><span class="desc-cell" title="${escAttr(p.description || '')}">${p.description || '-'}</span></td>
                    <td>
                        <button
                            class="status-toggle ${p.status == 1 ? 'active' : 'inactive'}"
                            id="status-btn-${p.ProductID}"
                            data-id="${p.ProductID}"
                            data-status="${p.status}">
                            ${p.status == 1 ? '✓ ใช้งาน' : '✕ ไม่ใช้งาน'}
                        </button>
                    </td>
                    <td class="action-btns">
                        <a href="/edit-product?id=${p.ProductID}" class="btn-sm btn-edit">แก้ไข</a>
                        <button class="btn-sm btn-delete" data-del-id="${p.ProductID}">ลบ</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            // Status toggle event delegation
            tbody.addEventListener('click', async (e) => {
                const btn = e.target.closest('.status-toggle');
                if (btn) { await handleStatusToggle(btn); return; }
                const delBtn = e.target.closest('[data-del-id]');
                if (delBtn) { await handleDelete(delBtn.dataset.delId); }
            });

        } catch (err) {
            content.innerHTML = '<p style="color:#ef4444;text-align:center">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
            console.error(err);
        }
    }

    async function handleStatusToggle(btn) {
        const id = btn.dataset.id;
        const currentStatus = parseInt(btn.dataset.status);
        const newStatus = currentStatus === 1 ? 0 : 1;
        btn.disabled = true;
        try {
            const res = await fetch(`${API_BASE}/${id}/status`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                btn.dataset.status = newStatus;
                btn.className = `status-toggle ${newStatus === 1 ? 'active' : 'inactive'}`;
                btn.textContent = newStatus === 1 ? '✓ ใช้งาน' : '✕ ไม่ใช้งาน';
            } else {
                alert('ไม่สามารถเปลี่ยนสถานะได้');
            }
        } catch (err) {
            console.error('Status toggle error:', err);
        } finally {
            btn.disabled = false;
        }
    }

    async function handleDelete(id) {
        if (!confirm('คุณต้องการลบสินค้านี้ใช่หรือไม่?')) return;
        try {
            const res = await fetch(`${API_BASE}/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const row = document.getElementById(`row-${id}`);
                if (row) row.remove();
            } else {
                alert('ไม่สามารถลบสินค้าได้');
            }
        } catch (err) {
            console.error('Delete error:', err);
        }
    }

    loadPMTypes();
}

// ── Add Product (/add-product) ────────────────────────────────────────────────
if (path === '/add-product') {

    document.getElementById('productForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('submitBtn');
        const errorMsg = document.getElementById('error-msg');
        const successMsg = document.getElementById('success-msg');

        submitBtn.disabled = true;
        submitBtn.textContent = 'กำลังบันทึก...';
        errorMsg.style.display = 'none';
        successMsg.style.display = 'none';

        const formData = new FormData();
        formData.append('name', document.getElementById('name').value);
        formData.append('type', document.getElementById('type').value);
        formData.append('brand', document.getElementById('brand').value);
        formData.append('price', document.getElementById('price').value);
        formData.append('description', document.getElementById('description').value);
        formData.append('status', 1);

        const imageFile = document.getElementById('image').files[0];
        if (imageFile) formData.append('image', imageFile);

        try {
            const res = await fetch(API_BASE, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const data = await res.json();
            if (res.ok) {
                successMsg.textContent = 'เพิ่มสินค้าสำเร็จ!';
                successMsg.style.display = 'block';
                document.getElementById('productForm').reset();
            } else {
                errorMsg.textContent = data.message || 'เกิดข้อผิดพลาด';
                errorMsg.style.display = 'block';
            }
        } catch (err) {
            errorMsg.textContent = 'Server error.';
            errorMsg.style.display = 'block';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'บันทึกสินค้า';
        }
    });
}

// ── Edit Product (/edit-product) ──────────────────────────────────────────────
if (path === '/edit-product') {

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    async function loadProduct() {
        try {
            const res = await fetch(`${API_BASE}/${productId}`);
            if (res.ok) {
                const p = await res.json();
                document.getElementById('productId').value = p.ProductID;
                document.getElementById('name').value = p.name;
                document.getElementById('type').value = p.type;
                document.getElementById('brand').value = p.brand;
                document.getElementById('price').value = p.price;
                document.getElementById('description').value = p.description || '';
                document.getElementById('existing_image_url').value = p.image_url || '';
                // Set status select
                const statusEl = document.getElementById('status');
                statusEl.value = p.status;
                if (p.image_url) {
                    document.getElementById('imgPreview').src = p.image_url;
                }
            } else {
                alert('Product not found');
                window.location.href = '/product-management';
            }
        } catch (err) {
            console.error(err);
        }
    }

    loadProduct();

    document.getElementById('productForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('submitBtn');
        const errorMsg = document.getElementById('error-msg');
        const successMsg = document.getElementById('success-msg');

        submitBtn.disabled = true;
        submitBtn.textContent = 'กำลังอัพเดต...';
        errorMsg.style.display = 'none';
        successMsg.style.display = 'none';

        const formData = new FormData();
        formData.append('name', document.getElementById('name').value);
        formData.append('type', document.getElementById('type').value);
        formData.append('brand', document.getElementById('brand').value);
        formData.append('price', document.getElementById('price').value);
        formData.append('description', document.getElementById('description').value);
        formData.append('existing_image_url', document.getElementById('existing_image_url').value);
        formData.append('status', document.getElementById('status').value);

        const imageFile = document.getElementById('image').files[0];
        if (imageFile) formData.append('image', imageFile);

        try {
            const res = await fetch(`${API_BASE}/${productId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const data = await res.json();
            if (res.ok) {
                successMsg.textContent = 'อัพเดตสินค้าสำเร็จ!';
                successMsg.style.display = 'block';
                loadProduct();
            } else {
                errorMsg.textContent = data.message || 'เกิดข้อผิดพลาด';
                errorMsg.style.display = 'block';
            }
        } catch (err) {
            errorMsg.textContent = 'Server error.';
            errorMsg.style.display = 'block';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'อัพเดตสินค้า';
        }
    });
}

// ── Search (/search) ──────────────────────────────────────────────────────────
if (path === '/search') {

    let search_step = 'types';  // 'types' | 'brands' | 'products' | 'keyword'
    let search_type = '';
    let search_brand = '';

    // ── Keyword search ──────────────────────────────────────────────────────
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-input');

    searchBtn.addEventListener('click', doKeywordSearch);
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') doKeywordSearch();
    });

    async function doKeywordSearch() {
        const q = searchInput.value.trim();
        if (!q) {
            search_step = 'types'; search_type = ''; search_brand = '';
            loadSearchTypes();
            return;
        }
        search_step = 'keyword'; search_type = ''; search_brand = '';
        renderSearchBreadcrumb();
        await loadSearchProducts({ q });
    }

    // ── Breadcrumb ──────────────────────────────────────────────────────────
    function renderSearchBreadcrumb() {
        const bc = document.getElementById('search-breadcrumb');
        if (search_step === 'types') { bc.style.display = 'none'; return; }

        let html = `<span class="crumb" id="bc-s-all">สินค้าทั้งหมด</span>`;
        if (search_step === 'brands' || search_step === 'products') {
            html += ` <span class="separator">›</span>
                      <span class="crumb" id="bc-s-type">${search_type}</span>`;
        }
        if (search_step === 'products') {
            html += ` <span class="separator">›</span> <span>${search_brand}</span>`;
        }
        if (search_step === 'keyword') {
            html += ` <span class="separator">›</span>
                      <span>ผลการค้นหา "${searchInput.value.trim()}"</span>`;
        }
        bc.innerHTML = html;
        bc.style.display = 'flex';

        document.getElementById('bc-s-all').addEventListener('click', () => {
            searchInput.value = '';
            search_step = 'types'; search_type = ''; search_brand = '';
            loadSearchTypes();
        });
        const typeEl = document.getElementById('bc-s-type');
        if (typeEl) {
            typeEl.addEventListener('click', () => {
                search_step = 'brands'; search_brand = '';
                loadSearchBrands();
            });
        }
    }

    // ── Step 1: Types ───────────────────────────────────────────────────────
    async function loadSearchTypes() {
        renderSearchBreadcrumb();
        const content = document.getElementById('search-content');
        content.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem 0">กำลังโหลด...</p>';
        try {
            const res = await fetch(`${API_BASE}/types`);
            const types = await res.json();
            if (types.length === 0) {
                content.innerHTML = '<p style="text-align:center;color:var(--text-muted)">ยังไม่มีสินค้า</p>';
                return;
            }
            content.innerHTML = `<div class="category-grid" id="search-type-grid"></div>`;
            const grid = document.getElementById('search-type-grid');
            types.forEach(t => {
                const card = document.createElement('div');
                card.className = 'category-card';
                card.innerHTML = `<h3>${t.type}</h3><p class="cat-count">${t.count} รายการ</p>`;
                card.addEventListener('click', () => {
                    search_type = t.type;
                    search_step = 'brands';
                    loadSearchBrands();
                });
                grid.appendChild(card);
            });
        } catch (err) {
            content.innerHTML = '<p style="color:#ef4444;text-align:center">เกิดข้อผิดพลาด</p>';
            console.error(err);
        }
    }

    // ── Step 2: Brands ──────────────────────────────────────────────────────
    async function loadSearchBrands() {
        renderSearchBreadcrumb();
        const content = document.getElementById('search-content');
        content.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem 0">กำลังโหลด...</p>';
        try {
            const res = await fetch(`${API_BASE}/brands?type=${encodeURIComponent(search_type)}`);
            const brands = await res.json();
            content.innerHTML = `<div class="category-grid" id="search-brand-grid"></div>`;
            const grid = document.getElementById('search-brand-grid');
            brands.forEach(b => {
                const card = document.createElement('div');
                card.className = 'category-card';
                card.innerHTML = `<h3>${b.brand}</h3><p class="cat-count">${b.count} รายการ</p>`;
                card.addEventListener('click', () => {
                    search_brand = b.brand;
                    search_step = 'products';
                    loadSearchProducts({ type: search_type, brand: search_brand });
                });
                grid.appendChild(card);
            });
        } catch (err) {
            content.innerHTML = '<p style="color:#ef4444;text-align:center">เกิดข้อผิดพลาด</p>';
            console.error(err);
        }
    }

    // ── Step 3: Product Cards ───────────────────────────────────────────────
    async function loadSearchProducts({ q = '', type = '', brand = '' } = {}) {
        renderSearchBreadcrumb();
        const content = document.getElementById('search-content');
        content.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem 0">กำลังโหลด...</p>';
        try {
            const params = new URLSearchParams();
            if (q) params.append('q', q);
            if (type) params.append('type', type);
            if (brand) params.append('brand', brand);

            const res = await fetch(`${API_BASE}/search?${params.toString()}`);
            const products = await res.json();

            if (products.length === 0) {
                content.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem 0">ไม่พบสินค้าที่ตรงกับเงื่อนไข</p>';
                return;
            }

            content.innerHTML = `<div class="content-grid" id="search-product-grid"></div>`;
            const grid = document.getElementById('search-product-grid');
            products.forEach(p => {
                const isUnavailable = p.status == 0;
                const card = document.createElement('div');
                card.className = 'product-card';
                card.innerHTML = `
                    <div class="product-img-wrapper">
                        <img src="${p.image_url || placeholderImg()}" alt="${escAttr(p.name)}">
                        ${isUnavailable ? '<div class="unavailable-overlay">สินค้าหมด</div>' : ''}
                    </div>
                    <div class="product-card-body">
                        <h3>${p.name}</h3>
                        <p class="price">${formatPrice(p.price)}</p>
                        <a href="/product-detail?id=${p.ProductID}"
                           class="btn-secondary"
                           style="padding:0.5rem 1.25rem;font-size:0.875rem;">
                           ดูรายละเอียด →
                        </a>
                    </div>
                `;
                grid.appendChild(card);
            });
        } catch (err) {
            content.innerHTML = '<p style="color:#ef4444;text-align:center">เกิดข้อผิดพลาด</p>';
            console.error(err);
        }
    }

    loadSearchTypes();
}

// ── Product Detail (/product-detail) ─────────────────────────────────────────
if (path === '/product-detail') {

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    // The back button logic is now handled directly in HTML using window.history

    async function loadProductDetail() {
        if (!productId) { window.location.href = '/search'; return; }
        const content = document.getElementById('product-detail-content');
        try {
            const res = await fetch(`${API_BASE}/${productId}`);
            if (!res.ok) { window.location.href = '/search'; return; }
            const p = await res.json();

            // Update page title
            document.title = `${p.name} | Nadeesakul`;

            const isUnavailable = p.status == 0;

            content.innerHTML = `
                <div class="detail-grid">
                    <div class="detail-img-wrapper">
                        <img class="detail-img"
                             src="${p.image_url || placeholderImg()}"
                             alt="${escAttr(p.name)}">
                        ${isUnavailable
                    ? '<div class="detail-unavailable-overlay">สินค้าหมด</div>'
                    : ''}
                    </div>
                    <div class="detail-info">
                        <div class="detail-type-brand">
                            <span class="badge badge-type">${p.type}</span>
                            <span class="badge badge-brand">${p.brand}</span>
                            ${isUnavailable
                    ? '<span class="badge badge-unavailable">ไม่พร้อมจำหน่าย</span>'
                    : ''}
                        </div>
                        <h1 class="detail-name">${p.name}</h1>
                        <div class="detail-price">${formatPrice(p.price)}</div>
                        <div>
                            <span class="detail-desc-label">รายละเอียดสินค้า</span>
                            <p class="detail-desc">${p.description || 'ไม่มีรายละเอียด'}</p>
                        </div>
                        <p class="detail-id">รหัสสินค้า: ${p.ProductID}</p>
                    </div>
                </div>
            `;
        } catch (err) {
            content.innerHTML = '<p style="color:#ef4444;text-align:center">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
            console.error(err);
        }
    }

    loadProductDetail();
}
