class exception {
    constructor(sender, message, name, stack) {
        this.sender = sender;
        this.message = message;
        this.name = name;
        this.stack = stack;
    }
}

module.exports = exception;