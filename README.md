# tree-sitter-dshl

[![CI][ci]](https://github.com/GaijinEntertainment/tree-sitter-dshl/actions/workflows/ci.yml)
[![crates][crates]](https://crates.io/crates/tree-sitter-dshl)
[![npm][npm]](https://www.npmjs.com/package/tree-sitter-dshl)
[![pypi][pypi]](https://pypi.org/project/tree-sitter-dshl)

DSHL grammar for [tree-sitter](https://github.com/tree-sitter/tree-sitter). DSHL is the shader language of the
[Dagor Engine](https://github.com/GaijinEntertainment/DagorEngine): it declares shaders, their variants and render
state, and the bindings of their variables, and wraps HLSL in `hlsl { }` blocks.

The grammar follows the shader compiler of the Dagor Engine. It does not expand includes or macros, so it accepts each
statement in each body: a macro body can hold the statements of any place where the macro is called. The text of an
HLSL block is one node with the `##if` directives of the compiler between its parts; `queries/injections.scm` gives
that text to an HLSL grammar.

## Versioning

The version of the grammar is a semantic version:

- A major release renames or removes a node kind or a field.
- A minor release adds node kinds, fields, or syntax.
- A patch release corrects the trees or the queries.

The supertypes and the `required` and `multiple` flags of `src/node-types.json` follow the rules of the grammar, and a
release of any kind can change them.

## References

- [The shader compiler](https://github.com/GaijinEntertainment/DagorEngine/tree/main/prog/tools/ShaderCompiler2)
- [The DSHL reference](https://github.com/GaijinEntertainment/DagorEngine/tree/main/_docs/source/api-references/dagor-dshl)

[ci]: https://img.shields.io/github/actions/workflow/status/GaijinEntertainment/tree-sitter-dshl/ci.yml?logo=github&label=CI
[crates]: https://img.shields.io/crates/v/tree-sitter-dshl?logo=rust
[npm]: https://img.shields.io/npm/v/tree-sitter-dshl?logo=npm
[pypi]: https://img.shields.io/pypi/v/tree-sitter-dshl?logo=pypi&logoColor=ffd242
