(
  (comment)* @doc
  .
  (macro_definition
    name: (identifier) @name) @definition.macro
  (#strip! @doc "^//\\s?|^/\\*\\s*|\\s*\\*/$")
  (#select-adjacent! @doc @definition.macro)
)

(
  (comment)* @doc
  .
  (shader_declaration
    name: (identifier) @name) @definition.class
  (#strip! @doc "^//\\s?|^/\\*\\s*|\\s*\\*/$")
  (#select-adjacent! @doc @definition.class)
)

(
  (comment)* @doc
  .
  (block_declaration
    name: (identifier) @name) @definition.interface
  (#strip! @doc "^//\\s?|^/\\*\\s*|\\s*\\*/$")
  (#select-adjacent! @doc @definition.interface)
)

[
  (render_pass_declaration
    name: (identifier) @name)
  (render_pass_group_declaration
    name: (identifier) @name)
  (framebuffer_layout_declaration
    name: (identifier) @name)
] @definition.class

(variable_declaration
  !modifier
  name: (identifier) @name) @definition.constant

(variable_declaration
  modifier: [
    "literal"
    "static"
    "dynamic"
  ]
  name: (identifier) @name) @definition.constant

(sampler_declaration
  name: (identifier) @name) @definition.constant

(bool_declaration
  name: (identifier) @name) @definition.constant

(interval_declaration
  name: (identifier) @name) @definition.enum

(preshader_variable
  name: (identifier) @name) @definition.field

(macro_call
  macro: (identifier) @name) @reference.call

(supports_statement
  block: (identifier) @name) @reference.implementation

[
  (shader_condition
    right: (identifier) @name)
  (subpass_reference
    pass: (identifier) @name)
] @reference.class
