// Define the old CMS_HOST and the new IP address or domain
const oldCMSHost = 'old-cms-host.com';
const newIPAddress = 'new-ip-address.com'; // or 'new-domain.com'

// Function to update image URLs in the rich text field content
function updateImageUrls(richTextFieldContent) {
  // Use regular expressions to find and replace old CMS_HOST with new IP address or domain
  const updatedContent = richTextFieldContent.replace(
    new RegExp(oldCMSHost, 'g'), // 'g' flag for global replacement
    newIPAddress
  );

  return updatedContent;
}

// Example usage:
const originalRichTextFieldContent = "Here is some content with an image <img src='http://old-cms-host.com/image.jpg' />.";
const updatedRichTextFieldContent = updateImageUrls(originalRichTextFieldContent);

// Print the updated content to check if the image URLs are modified
console.log(updatedRichTextFieldContent);
