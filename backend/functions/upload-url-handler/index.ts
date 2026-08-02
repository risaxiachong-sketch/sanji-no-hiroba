import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { success, error } from '../../shared/response.js';
import { validateUpload, validateApiKey } from '../../shared/validation.js';
import { routeKey } from '../../shared/routing.js';
import { ulid } from 'ulid';

const s3 = new S3Client({ region: 'ap-northeast-1' });

async function generateUploadUrl(event: APIGatewayProxyEventV2) {
  // APIキー検証
  const apiKeyResult = validateApiKey(
    (event.headers as Record<string, string | undefined>) ?? {},
  );
  if (!apiKeyResult.valid) {
    return error(403, 'FORBIDDEN', apiKeyResult.error);
  }

  // bodyからcontentType, fileSizeを取得
  const body = JSON.parse(event.body ?? '{}');
  const { contentType, fileSize } = body;

  // バリデーション
  const uploadResult = validateUpload({ contentType, fileSize });
  if (!uploadResult.valid) {
    return error(400, 'VALIDATION_ERROR', uploadResult.error);
  }

  // ULIDでeventId生成
  const eventId = ulid();

  // 拡張子決定
  const ext = contentType === 'image/jpeg' ? 'jpg' : 'png';

  // S3キー
  const key = `events/${eventId}/image.${ext}`;

  // 署名付きURL生成
  const bucket = process.env.S3_BUCKET ?? 'sanji-demo-images';
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

  return success({ uploadUrl, key, expiresIn: 300 });
}

export const handler = async (event: APIGatewayProxyEventV2) => {
  const route = routeKey(event);

  switch (route) {
    case 'POST /admin/events/upload-url':
      return generateUploadUrl(event);
    default:
      return error(404, 'NOT_FOUND', 'Not Found');
  }
};
