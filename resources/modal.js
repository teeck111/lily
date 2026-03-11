class ImageModal {
  constructor(modal, modalImg) {
    this.modal = modal;
    this.modalImg = modalImg;
    this.images = [];
    this.currentIndex = 0;
  }

  // Set the array of images
  setImages(images) {
    this.images = images;
  }

  // Open the modal and set initial image based on index
  openModal(index) {
    this.modal.style.display = 'block';
    this.currentIndex = index;
    this.modalImg.src = this.images[index];

    // Add Hammer.js swipe event listeners
    const hammer = new Hammer(this.modalImg);
    hammer.on('swipeleft', () => {
      this.showNextImage();
    });
    hammer.on('swiperight', () => {
      this.showPreviousImage();
    });

    // Add event listener for key presses
    document.addEventListener('keydown', this.handleKeyPress);
  }

  // Close the modal and remove event listener
  closeModal() {
    this.modal.style.display = 'none';
    document.removeEventListener('keydown', this.handleKeyPress);
  }

  // Handle key presses (ArrowLeft and ArrowRight)
  handleKeyPress = (event) => {
    if (event.key === 'ArrowLeft') {
      this.showPreviousImage();
    } else if (event.key === 'ArrowRight') {
      this.showNextImage();
    }
  };

  // Show the next image
  showNextImage() {
    this.currentIndex = (this.currentIndex + 1) % this.images.length;
    this.modalImg.src = this.images[this.currentIndex];
  }

  // Show the previous image
  showPreviousImage() {
    this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
    this.modalImg.src = this.images[this.currentIndex];
  }
}

// Note: Modal initialization is handled by gallery.js after dynamic rendering

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();

    const targetId = this.getAttribute('href');
    const targetElement = document.querySelector(targetId);

    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: 'smooth'
      });
    }
  });
});
