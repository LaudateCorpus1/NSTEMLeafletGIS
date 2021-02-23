# NSTEM Leaflet GIS
This project is specifically programmed to help display the hundreds
of Educated Affiliated Partners of NSTEM on a map located on nstem.org.

## Installation
Simply import the single_leaflet.js file into your HTML page with the
current credentials as well as make sure to have the correct HTML elements
with the corresponding IDs written in code.

### Detailed Installation
In the provided index.html file, copy and paste scripts found in the head tag in order as well as the commented out code for handleClientLoad if you are importing on Wordpress. Also if you are on Wordpress make sure you include the correct HTML code tags around what you copy and paste. Include the style tag if it doesn't already exist. Finally include all necessary divs with their ids in the body tag of the HTML file.

## Fixing the Code
To update the code you'll want to look at the single_leaflet_git.js file, specifically the IDs global array and the NSTEMMap class' constructor/init/initSearchEngine method. The functions are reliant on hardcoded values found in index.html and may often cause a problem if either the HTML page has changed or if the Educational Partners spreadsheet is updated.

## On Using the NSTEM Leaflet and other tips
The provided files do not include the actual credentials used in the final product for security reasons. When using credentials provided by the Google Developer Console, make sure to obfuscate your code to make it unreadable. Secondly, if you have more questions about how the GAPI works or how to get set up with the Developer console, check out my Backend_Google_API project.