const express = require('express');
const https = require('https');

const app = express();
const port = 3000;

app.use(express.json());


function getTask() {
  return new Promise((resolve, reject) => {
    https.get('https://interview.adpeai.com/api/v2/get-task', (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve(JSON.parse(data));
      });
    }).on('error', reject);
  });
}

function submitTask(id, result) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ id, result });
    const options = {
      hostname: 'interview.adpeai.com',
      path: '/api/v2/submit-task',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    };
    console.log(`postData : ${postData}`)
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, data: data });
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  try {
    const task = await getTask();
    const { id, transactions } = task;

    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;

    const employeeTransactions = {};
    transactions.forEach(transaction => {
      const year = new Date(transaction.timeStamp).getFullYear();
      if (year === lastYear) {
        const employeeId = transaction.employee.id;
        if (!employeeTransactions[employeeId]) {
          employeeTransactions[employeeId] = { total: 0, transactions: [] };
        }
        employeeTransactions[employeeId].total += transaction.amount;
        employeeTransactions[employeeId].transactions.push(transaction);
      }
    });

    const topEarner = Object.entries(employeeTransactions).reduce((top, [id, data]) => 
      data.total > top.total ? { id, ...data } : top
    , { total: 0 });

    const alphaTransactions = topEarner.transactions
      .filter(t => t.type === 'alpha')
      .map(t => t.transactionID);

    const response = await submitTask(id, alphaTransactions);

    console.log('Response Status:', response.statusCode);
    console.log('Response Data:', response.data);

    if (response.statusCode === 200) {
      console.log('Task completed successfully!');
    } else {
      console.log('Task failed. Please check the response for more information.');
    }

  } catch (error) {
    console.error('An error occurred:', error);
  }
}

app.get('/process-transactions', async (req, res) => {
    try {
      const result = await main();
      res.status(200).json("Task completed successfully!");
    } catch (error) {
      console.error('An error occurred:', error);
      res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
  });
  
app.listen(port, () => {
console.log(`Server running at http://localhost:${port}`);
});

main();

