// backend/testFirebase.js
const { db } = require('./firebase');

async function testFirestore() {
  try {
    const testData = {
      title: 'Test Issue',
      description: 'Testing Firebase connection',
      hash: '0x123456789abcdef',
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection('incidents').add(testData);
    console.log('✅ Test data added with ID:', docRef.id);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding document:', error);
    process.exit(1);
  }
}

testFirestore();


