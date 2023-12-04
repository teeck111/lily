class ImageModal {
  constructor(modal, modalImg) {
    this.modal = modal;
    this.modalImg = modalImg;
  }

  openModal(imageSrc) {
    this.modal.style.display = 'block';
    this.modalImg.src = imageSrc;
  }

  closeModal() {
    this.modal.style.display = 'none';
  }
}

const modal = document.getElementById('myModal');
const modalImg = document.getElementById('modalImg');
const images = document.querySelectorAll('.gallery-image');

const imgModal = new ImageModal(modal, modalImg);

images.forEach((image) => {
  image.addEventListener('click', () => {
    imgModal.openModal(image.src);
  });
});

window.addEventListener('click', (event) => {
  if (event.target === modal) {
    imgModal.closeModal();
  }
});
