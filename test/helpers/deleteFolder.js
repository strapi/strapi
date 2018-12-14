const fs = require('fs');
const path = require('path');

module.exports = {
  deleteApp: async function(folderName) {
    const recursiveDeleteFiles = async (folderPath) => {
      // Check if folder exists
      try {
        const arrayOfPromises = [];
        fs.accessSync(folderPath);
        const items = fs.readdirSync(folderPath);
  
        items.forEach(item => {
          const itemPath = path.join(folderPath, item);
          // Check if directory
          if (fs.lstatSync(itemPath).isDirectory()) {
            return arrayOfPromises.push(recursiveDeleteFiles(itemPath));
          } else {
            // Delete all files
            try {
              fs.unlinkSync(itemPath);
            } catch(err) {
              console.log('Cannot delete file', err);
            }
          }
        });
        
        await Promise.all(arrayOfPromises);
  
        try {
          fs.rmdirSync(folderPath);
        } catch(err) {
          // Silent
        }
      } catch(err) {
        // Silent
      }
    }

    return await Promise.all([recursiveDeleteFiles(folderName)]);
  }
};