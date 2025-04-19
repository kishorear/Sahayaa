declare module 'helmet';

interface Array<T> {
  entries(): IterableIterator<[number, T]>;
}

interface Map<K, V> {
  entries(): IterableIterator<[K, V]>;
}

// Add proper typing for response.end method to fix buffer encoding issues
interface Response {
  end(cb?: (() => void) | undefined): Response;
  end(chunk: any, cb?: (() => void) | undefined): Response;
  end(chunk: any, encoding: BufferEncoding, cb?: (() => void) | undefined): Response;
}