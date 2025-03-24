# Obfuscate PDFs

```bash
docker run --rm -it -v $PWD:/workdir debian
apt update && apt install --yes pdftk-java
pdftk original.pdf output original-2.pdf uncompress
sed -i 's/from/to/' original-2.pdf
pdftk original-2.pdf output original.pdf compress
```
