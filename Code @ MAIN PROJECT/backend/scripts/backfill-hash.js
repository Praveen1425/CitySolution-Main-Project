// scripts/backfill-hash.js - one-time backfill of missing `hash` for incidents
const { db } = require('../firebase');
const crypto = require('crypto');

function computeFirebaseHash(issue) {
  const normTitle = String(issue.title || '').trim().toLowerCase();
  const normDesc = String(issue.description || '').trim().toLowerCase();
  const normCat = String(issue.category || '').trim().toLowerCase();
  const normLoc = String(issue.location || '').trim().toLowerCase();
  const normLat = issue.latitude != null ? String(Number(issue.latitude)) : '';
  const normLng = issue.longitude != null ? String(Number(issue.longitude)) : '';
  const str = `${normTitle}|${normDesc}|${normCat}|${normLoc}|${normLat}|${normLng}`;
  return '0x' + crypto.createHash('sha256').update(str).digest('hex');
}

async function backfillHashes() {
  const snapshot = await db.collection('incidents').get();
  let total = snapshot.size;
  let updated = 0;
  let skipped = 0;

  console.log(`Found ${total} incident documents. Starting backfill...`);

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();

    // Skip if hash already exists
    if (data.hash) {
      skipped++;
      continue;
    }

    // Skip if missing required fields
    if (!data.title || !data.description || !data.category || !data.location) {
      console.warn(`Skipping ${docSnap.id}: missing required fields`);
      skipped++;
      continue;
    }

    const hash = computeFirebaseHash(data);
    await db.collection('incidents').doc(docSnap.id).update({ hash });
    console.log(`✅ Updated ${docSnap.id} with hash ${hash}`);
    updated++;
  }

  console.log(`\n🎯 Backfill complete. Updated: ${updated}, Skipped: ${skipped}, Total: ${total}`);
}

backfillHashes()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error during hash backfill:', err);
    process.exit(1);
  });


