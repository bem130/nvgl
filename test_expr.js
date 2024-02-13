const peg = require("./expr.js");


let inputs = [
    "1",
    "-1",
    "10",
    "-10",
    "+10",
    "1.0",
    "1.1",
    "1.01",
    "5-2",
    "5-2",
    "5+2-1",
    "1+2+3+4+5",
    "5+3*2",
    "5+3*2+3",
    "5+3*(2+3)",
    "(5+3)*2+3",
    "(5+3)*2+(3)-1",
    "(5.5+3.1)*2.01+3.5",
    `"a"+"bcd"`,
    `{10,5,3}`,
    `{10,5,3,}`,
    `{"a":1,"b":2,}`,
    `{0:1,1:2,}`,
    `{"a":{"b":5},1:2,}`,
    `{"a":{"b":5},1:2,}::a::b`,
]

for (let i of inputs) {
    console.log("")
    console.log("input: ",i);
    try {
        let ret = peg.parse(i);
        //console.log("output:",JSON.stringify(ret,null,null));
        console.log("output:",ret);
    }
    catch (e) {
        console.log(`failed: [${e.name}] ${e.message}`);
    }
}