{pkgs}: {
  deps = [
    # Core utilities
    pkgs.unzip
    pkgs.zip
    pkgs.jq
    pkgs.curl
    pkgs.bash

    # Database - PostgreSQL client libs needed by psycopg2 and pg node module
    pkgs.postgresql
    pkgs.libpq

    # C/C++ build toolchain - required for native Python/Node extensions
    pkgs.gcc
    pkgs.gnumake
    pkgs.pkg-config
    pkgs.stdenv.cc.cc.lib

    # Python build dependencies
    pkgs.libffi       # required by many Python C extensions
    pkgs.openssl      # TLS/SSL support for Python packages
    pkgs.zlib         # compression support
    pkgs.readline     # Python REPL and readline bindings
    pkgs.sqlite       # ChromaDB uses SQLite as its default backend

    # Linear algebra - required by numpy, scikit-learn, scipy
    pkgs.openblas

    # Locale and crypto support
    pkgs.glibcLocales
    pkgs.libxcrypt    # needed for password hashing libraries
  ];
}
