import { generateId } from './misc';
import { Attachment } from './types/attachments';

export async function fileToAttachment(file: File): Promise<Attachment> {
  const { name, type } = file;

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      resolve(readerEvent.target?.result as string);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });

  return {
    id: generateId(),
    status: 'ready',
    filename: name,
    mediaType: type,
    url: dataUrl,
    type: 'file',
  };
}
