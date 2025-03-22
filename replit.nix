{pkgs}: {
  deps = [
    pkgs.nodejs
    pkgs.imagemagick
    pkgs.inkscape
    pkgs.librsvg
    pkgs.wkhtmltopdf
    pkgs.postgresql
  ];
}
