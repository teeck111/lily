$(document).ready(function() {
    // Attach a click event to all elements with the 'img-modal' class
    $('.img-modal').on('click', function() {
        // Get the source of the clicked image
        var imgSrc = $(this).attr('src');

        // Set the source of the modal image
        $('#modalImage').attr('src', imgSrc);

        // Show the modal
        $('#imageModal').modal('show');
    });
});
