// gallery.js — Dynamically render gallery from server data

let galleryData = [];

async function loadGallery() {
  // Try sources in order: Cloudinary URL, local API, local file
  const sources = [
    CONFIG.CLOUDINARY_GALLERY_URL,
    '/api/gallery',
    'gallery.json'
  ].filter(Boolean);

  for (const url of sources) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        galleryData = await res.json();
        renderGallery();
        return;
      }
    } catch (err) {
      // Try next source
    }
  }
  console.error('Failed to load gallery from any source');
}

function renderGallery() {
  const container = document.getElementById('gallery-grid');
  container.innerHTML = '';

  galleryData.forEach((row, rowIndex) => {
    const rowWrapper = document.createElement('div');
    rowWrapper.className = 'px-4 text-center';
    rowWrapper.setAttribute('data-row-index', rowIndex);

    const rowDiv = document.createElement('div');
    rowDiv.className = 'row gx-0 gallery-row';
    rowDiv.setAttribute('data-row-index', rowIndex);

    row.forEach((photo, photoIndex) => {
      const col = document.createElement('div');
      col.className = 'col';
      col.setAttribute('data-photo-src', photo.src);

      const inner = document.createElement('div');
      inner.className = 'p-0 border bg-light';
      inner.style.position = 'relative';

      const img = document.createElement('img');
      img.className = 'img-fluid gallery-image';
      img.src = photo.src;
      img.alt = photo.alt || '';
      img.id = 'myImg';

      // Delete button (hidden unless admin mode)
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'admin-delete-btn';
      deleteBtn.innerHTML = '&times;';
      deleteBtn.title = 'Delete photo';
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        if (confirm('Delete this photo?')) {
          deletePhoto(photo.src);
        }
      };

      inner.appendChild(img);
      inner.appendChild(deleteBtn);
      col.appendChild(inner);
      rowDiv.appendChild(col);
    });

    rowWrapper.appendChild(rowDiv);
    container.appendChild(rowWrapper);
  });

  // Re-initialize modal for the new images
  initModal();

  // If admin mode is active, re-init sortable
  if (document.body.classList.contains('admin-mode') && typeof initSortable === 'function') {
    initSortable();
  }
}

function initModal() {
  const modal = document.getElementById('myModal');
  const modalImg = document.getElementById('modalImg');
  const images = document.querySelectorAll('#gallery-grid .gallery-image');

  // Re-create ImageModal
  const imgModal = new ImageModal(modal, modalImg);
  const imageSources = Array.from(images).map(img => img.src);
  imgModal.setImages(imageSources);

  images.forEach((image, index) => {
    // Remove old listeners by cloning
    const newImg = image.cloneNode(true);
    image.parentNode.replaceChild(newImg, image);
    newImg.addEventListener('click', () => {
      imgModal.openModal(index);
    });
  });

  // Close modal on background click
  window.onclick = (event) => {
    if (event.target === modal) {
      imgModal.closeModal();
    }
  };
}

// Load gallery on page ready
document.addEventListener('DOMContentLoaded', loadGallery);
