export interface StorageProvider {
  upload(file: Buffer, path: string, mimeType: string): Promise<string>;
  update(file: Buffer, path: string, mimeType: string): Promise<string>;
  delete(path: string): Promise<void>;
  getSignedUrl(path: string): Promise<string>;
}
