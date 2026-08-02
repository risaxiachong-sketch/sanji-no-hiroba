import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { EVENTS } from '../../frontend/src/data/events.ts';
import { docClient, TABLE_EVENTS } from '../shared/dynamodb.js';

const apply = process.argv.includes('--apply');
let inserted = 0;
let existing = 0;

if (!apply) {
  console.log(`Dry run: ${EVENTS.length} design events are ready for ${TABLE_EVENTS}.`);
  console.log('Run with --apply after backup.');
  process.exit(0);
}

for (const event of EVENTS) {
  const now = new Date().toISOString();
  try {
    await docClient.send(new PutCommand({
      TableName: TABLE_EVENTS,
      Item: {
        ...event,
        pk: 'EVENTS',
        sk: `EVENT#${event.id}`,
        eventId: event.id,
        createdAt: now,
        updatedAt: now,
      },
      ConditionExpression: 'attribute_not_exists(pk)',
    }));
    inserted += 1;
  } catch (cause) {
    if ((cause as { name?: string }).name !== 'ConditionalCheckFailedException') throw cause;
    existing += 1;
  }
}

console.log(`Seed complete: ${inserted} inserted, ${existing} already existed.`);