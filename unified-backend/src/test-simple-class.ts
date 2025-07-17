// Test a simple class without dependencies
export class TestClass {
  constructor() {
    console.log("TestClass created");
  }
  
  test() {
    return "working";
  }
}

// Test the class
const instance = new TestClass();
console.log("Result:", instance.test());