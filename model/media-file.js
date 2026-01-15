class MediaFile {
    constructor(originalFilename, newFilename, mimetype, fileExtension) {
        this.originalFilename = originalFilename;
        this.newFilename = newFilename;
        this.mimetype = mimetype;
        this.fileExtension = fileExtension;

    }
}
module.exports = MediaFile;