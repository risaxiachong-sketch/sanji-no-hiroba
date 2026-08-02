import { CreateBackupCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb';

const apply = process.argv.includes('--apply');
const client = new DynamoDBClient({ region: process.env.AWS_REGION ?? 'ap-northeast-1' });
const tableNames = [
  process.env.TABLE_POSTS ?? 'sanji-demo-posts',
  process.env.TABLE_REACTIONS ?? 'sanji-demo-reactions',
  process.env.TABLE_EVENTS ?? 'sanji-demo-events',
];
const stamp = new Date().toISOString().replace(/[:.]/g, '-');

if (!apply) {
  console.log('Dry run: backups would be created for:');
  tableNames.forEach((name) => console.log(`- ${name}`));
  console.log('Run with --apply after confirming the AWS account and region.');
  process.exit(0);
}

for (const tableName of tableNames) {
  const backupName = `${tableName}-before-v2-${stamp}`;
  const result = await client.send(new CreateBackupCommand({ TableName: tableName, BackupName: backupName }));
  console.log(`Created ${backupName}: ${result.BackupDetails?.BackupArn ?? 'pending'}`);
}