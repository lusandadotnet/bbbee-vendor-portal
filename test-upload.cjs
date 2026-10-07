const fs = require('fs');

// 1. Read your local PDF and encode it exactly like a browser frontend would
const fileBuffer = fs.readFileSync('test.pdf');
const base64File = 'data:application/pdf;base64,' + fileBuffer.toString('base64');

const payload = {
    supplierId: "10000000-0000-0000-0000-000000000001",
    enterpriseType: "QSE",
    file: base64File
};

console.log("Transmitting PDF to local CAP server...");

// 2. Fire the payload at your local endpoint (using 'alice' for CAP's default local mock auth)
fetch('http://localhost:4004/odata/v4/compliance/uploadCertificate', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic YWxpY2U6' 
    },
    body: JSON.stringify(payload)
})
.then(res => res.json())
.then(data => console.log("\n[SERVER RESPONSE]:", JSON.stringify(data, null, 2)))
.catch(err => console.error("Error:", err));