"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestClass = void 0;
// Test a simple class without dependencies
class TestClass {
    constructor() {
        console.log("TestClass created");
    }
    test() {
        return "working";
    }
}
exports.TestClass = TestClass;
// Test the class
const instance = new TestClass();
console.log("Result:", instance.test());
