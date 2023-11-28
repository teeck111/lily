$(document).ready(function() {
    // Attach a click event to all elements with the 'img-modal' class
    $('.img-modal').on('click', function() {
        // Get the source of the clicked image
        var imgSrc = $(this).attr('src');
        var caption = $(this).attr('alt');

        // Set the source and caption of the modal image
        $('#modalImage').attr('src', imgSrc);
        $('#caption').text(caption); // Set the caption text


        // Show the modal
        $('#imageModal').modal('show');
    });
});
