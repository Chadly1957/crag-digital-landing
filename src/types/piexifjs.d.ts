declare module "piexifjs" {
  type Rational = [number, number];
  type DMS = [Rational, Rational, Rational];

  interface GPSIFDType {
    GPSLatitudeRef: number;
    GPSLatitude: number;
    GPSLongitudeRef: number;
    GPSLongitude: number;
    GPSAltitudeRef: number;
    GPSAltitude: number;
    GPSImgDirectionRef: number;
    GPSImgDirection: number;
    GPSMapDatum: number;
  }

  interface ImageIFDType {
    XResolution: number;
    YResolution: number;
    ResolutionUnit: number;
    Software: number;
    DateTime: number;
    YCbCrPositioning: number;
    Compression: number;
    JPEGInterchangeFormat: number;
    JPEGInterchangeFormatLength: number;
  }

  interface ExifIFDType {
    ExifVersion: number;
    FlashPixVersion: number;
    ColorSpace: number;
    PixelXDimension: number;
    PixelYDimension: number;
    DateTimeOriginal: number;
    DateTimeDigitized: number;
    UserComment: number;
  }

  interface ExifObj {
    "0th": Record<number, unknown>;
    Exif: Record<number, unknown>;
    GPS: Record<number, unknown>;
    "1st": Record<number, unknown>;
    thumbnail?: string | null;
  }

  const GPSIFD: GPSIFDType;
  const ImageIFD: ImageIFDType;
  const ExifIFD: ExifIFDType;

  function load(dataURL: string): ExifObj;
  function dump(exifObj: ExifObj): string;
  function insert(exifBytes: string, dataURL: string): string;
  function remove(dataURL: string): string;
}
