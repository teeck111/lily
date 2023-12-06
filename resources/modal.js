// class ImageModal {
//   constructor(modal, modalImg) {
//     this.modal = modal;
//     this.modalImg = modalImg;
//   }

//   openModal(imageSrc) {
//     this.modal.style.display = 'block';
//     this.modalImg.src = imageSrc;
//   }

//   closeModal() {
//     this.modal.style.display = 'none';
//   }
// }

// const modal = document.getElementById('myModal');
// const modalImg = document.getElementById('modalImg');
// const images = document.querySelectorAll('.gallery-image');

// const imgModal = new ImageModal(modal, modalImg);

// images.forEach((image) => {
//   image.addEventListener('click', () => {
//     imgModal.openModal(image.src);
//   });
// });

// window.addEventListener('click', (event) => {
//   if (event.target === modal) {
//     imgModal.closeModal();
//   }
// });

class ImageModal {
  constructor(modal, modalImg) {
    this.modal = modal;
    this.modalImg = modalImg;
    this.images = [];
    this.currentIndex = 0;
  }

  setImages(images) {
    this.images = images;
  }

  openModal(index) {
    this.modal.style.display = 'block';
    this.currentIndex = index;
    this.modalImg.src = this.images[index];

    const hammer = new Hammer(this.modalImg);

    hammer.on('swipeleft', () => {
      this.showNextImage();
    });

    hammer.on('swiperight', () => {
      this.showPreviousImage();
    });
  }

  closeModal() {
    this.modal.style.display = 'none';
  }

  showNextImage() {
    this.currentIndex = (this.currentIndex + 1) % this.images.length;
    this.modalImg.src = this.images[this.currentIndex];
  }

  showPreviousImage() {
    this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
    this.modalImg.src = this.images[this.currentIndex];
  }
}

const modal = document.getElementById('myModal');
const modalImg = document.getElementById('modalImg');
const images = document.querySelectorAll('.gallery-image');

const imgModal = new ImageModal(modal, modalImg);

const imageSources = Array.from(images).map((image) => image.src);
imgModal.setImages(imageSources);

images.forEach((image, index) => {
  image.addEventListener('click', () => {
    imgModal.openModal(index);
  });
});

window.addEventListener('click', (event) => {
  if (event.target === modal) {
    imgModal.closeModal();
  }
});
