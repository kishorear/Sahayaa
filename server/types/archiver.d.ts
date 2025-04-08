declare module 'archiver' {
  import { Readable, Stream } from 'stream';
  
  interface ArchiverOptions {
    statConcurrency?: number;
    store?: boolean;
    zlib?: object;
  }
  
  interface EntryData {
    name?: string;
    prefix?: string;
    stats?: object;
    date?: Date | string;
    mode?: number;
  }
  
  class Archiver extends Stream {
    pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean }): T;
    append(source: string | Buffer | Readable, name: EntryData | string): this;
    directory(dirpath: string, destpath: string | false, data?: EntryData | Function): this;
    file(filepath: string, name: EntryData | string): this;
    glob(pattern: string, options?: object, data?: EntryData): this;
    finalize(): Promise<void>;
    setFormat(format: string): this;
    setModule(module: Function): this;
    bulk(mappings: any[]): this;
    pointer(): number;
  }

  function archiver(format: string, options?: ArchiverOptions): Archiver;
  
  export = archiver;
}