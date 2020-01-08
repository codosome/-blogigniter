importScripts("./jimp.min.js");

self.addEventListener("message", function(e) {
  Jimp.read(e.data).then(function (image) {
    const config = {image_max: {width: 1440, height: 1440}};

    // resize image if it's too big
    if (image.bitmap.width > config.image_max.width || image.bitmap.height > config.image_max.height)
    {
      const size = image.bitmap.width > image.bitmap.height
        ? {w: config.image_max.width, h: Jimp.AUTO}
        : {w: Jimp.AUTO, h: config.image_max.height};
      image.resize(size.w, size.h);
    }

    image.quality(80)                 // set JPEG quality
    .getBase64(Jimp.AUTO, function (err, src) {
      self.postMessage(src);
      self.close();
    });
  });
});
