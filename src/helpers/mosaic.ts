import { Constants } from '../constants';

/* Handler for mosaic (multi-image combiner) */
export const handleMosaic = async (
  mediaList: APIPhoto[],
  id: string
): Promise<APIMosaicPhoto | null> => {
  const mosaicDomains = Constants.MOSAIC_DOMAIN_LIST;
  let selectedDomain: string | null = null;
  while (selectedDomain === null && mosaicDomains.length > 0) {
    const domain = mosaicDomains[Math.floor(Math.random() * mosaicDomains.length)];
    selectedDomain = domain;
  }

  /* Fallback if there are no Mosaic servers */
  if (selectedDomain === null) {
    return null;
  } else {
    const mosaicMedia = mediaList.map(
      media => media.url?.match(/(?<=\/media\/)[\w-]+(?=[.?])/g)?.[0] || ''
    );
    const baseUrl = `https://${selectedDomain}/`;
    let path = '';

    for (let j = 0; j < 4; j++) {
      path += `/${mosaicMedia[j]}`;
    }

    const size = calcSize(
      mediaList.map(i => ({ width: i.width, height: i.height } as Size))
    );
    return {
      height: size.height,
      width: size.width,
      formats: {
        jpeg: `${baseUrl}jpeg/${id}${path}`,
        webp: `${baseUrl}webp/${id}${path}`
      }
    } as APIMosaicPhoto;
  }
};

/* TypeScript Port of https://github.com/FixTweet/mosaic/blob/feature/size-endpoint/src/mosaic.rs#L236
   We use this to generate accurate mosaic sizes which helps Discord render it correctly */

const SPACING_SIZE = 10;
/* This number will be multiplied by the height and weight
   if all combined images are over 2000 pixels in height or width.
   In my tests setting this to 0.5 increased performance by 4x (at the cost of 50% resolution)
   NOTE: This only works for when there's 4 images supplied. */
const BIG_IMAGE_MULTIPLIER = 1;

const calcSize = (images: Size[]): Size => {
  if (images.length === 1) {
    return images[0];
  } else if (images.length === 2) {
    const size = calcHorizontalSize(images[0], images[1]);
    return size as Size;
  } else if (images.length === 3) {
    const size = calcHorizontalSize(images[0], images[1]);
    const thirdSize = calcVerticalSize(size, images[2]);

    if (thirdSize.secondHeight * 1.5 > size.height) {
      return calcHorizontalSize(size, images[2]) as Size;
    } else {
      return thirdSize as Size;
    }
  } else if (images.length === 4) {
    const top = calcHorizontalSize(images[0], images[1]);
    const bottom = calcHorizontalSize(images[2], images[3]);
    const all = calcVerticalSize(top, bottom);

    const sizeMult = all.width > 2000 || all.height > 2000 ? BIG_IMAGE_MULTIPLIER : 1;
    return {
      width: all.width * sizeMult,
      height: all.height * sizeMult
    };
  } else {
    throw new Error('Invalid number of images');
  }
};

const calcHorizontalSize = (first: Size, second: Size): HorizontalSize => {
  let small = second;
  let big = first;
  let swapped = false;
  if (second.height > first.height) {
    small = first;
    big = second;
    swapped = true;
  }

  const smallWidth = Math.round((big.height / small.height) * small.width);
  return {
    width: smallWidth + SPACING_SIZE + big.width,
    height: big.height,
    firstWidth: swapped ? smallWidth : big.width,
    secondWidth: swapped ? big.width : smallWidth
  } as HorizontalSize;
};

const calcVerticalSize = (first: Size, second: Size): VerticalSize => {
  let small = second;
  let big = first;
  let swapped = false;
  if (second.width > first.width) {
    small = first;
    big = second;
    swapped = true;
  }

  const smallHeight = Math.round((big.width / small.width) * small.height);
  return {
    width: big.width,
    height: smallHeight + SPACING_SIZE + big.height,
    firstHeight: swapped ? smallHeight : big.height,
    secondHeight: swapped ? big.height : smallHeight
  } as VerticalSize;
};
