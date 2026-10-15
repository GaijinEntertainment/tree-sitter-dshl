(identifier) @variable

((identifier) @constant
  (#match? @constant "^[A-Z][A-Z0-9_]*$"))

(macro_parameters
  (identifier) @variable.parameter)

(parameter_statement
  parameter: (identifier) @variable.parameter)

(preshader_variable
  type: (identifier) @variable.parameter)

(macro_definition
  name: (identifier) @function.macro)

(macro_call
  macro: (identifier) @function.macro)

(function_call
  function: (identifier) @function.call)

((function_call
  function: (identifier) @function.builtin)
  (#any-of? @function.builtin
    "time_phase" "sin" "cos" "pow" "sRGBread" "vecpow" "fsel" "sqrt" "min" "max" "anim_frame" "wind_coeff"
    "fade_val" "get_dimensions" "get_size" "get_viewport" "request_sampler" "exists_tex" "exists_buf" "uint2"
    "int2" "uint3" "int3" "uint4" "int4"))

(shader_declaration
  name: (identifier) @type)

(block_declaration
  name: (identifier) @type)

(supports_statement
  block: (identifier) @type)

(shader_condition
  right: (identifier) @type)

(render_pass_declaration
  name: (identifier) @type)

(render_pass_group_declaration
  name: (identifier) @type)

(framebuffer_layout_declaration
  name: (identifier) @type)

(subpass_declaration
  name: (identifier) @type)

(subpass_reference
  pass: (identifier) @type)

(subpass_reference
  subpass: (identifier) @type)

(framebuffer_layout_any_of
  member: (identifier) @type)

[
  (any_of
    function: (identifier) @function.builtin)
  (framebuffer_layout_any_of
    function: (identifier) @function.builtin)
  (resolve
    function: (identifier) @function.builtin)
]

[
  (render_pass_flag
    name: (identifier) @keyword)
  (render_target_declaration
    kind: (identifier) @keyword)
  (subpass_declaration
    kind: (identifier) @keyword)
  (attachment_list
    kind: (identifier) @keyword)
]

[
  (render_target_declaration
    qualifier: (identifier) @keyword.modifier)
  (attachment
    qualifier: (identifier) @keyword.modifier)
]

[
  (render_target_declaration
    format: (identifier) @type.builtin)
  (attachment
    format: (identifier) @type.builtin)
  (resolve
    format: (identifier) @type.builtin)
  (framebuffer_target
    format: (identifier) @type.builtin)
]

[
  (render_target_declaration
    samples: (identifier) @number)
  (attachment
    samples: (identifier) @number)
  (resolve
    samples: (identifier) @number)
  (framebuffer_target
    samples: (identifier) @number)
]

(framebuffer_target
  name: (identifier) @variable.member)

[
  (block_declaration
    scope: (identifier) @attribute)
  (preshader_block
    stage: (identifier) @attribute)
  (hlsl_block
    stage: (identifier) @attribute)
  (render_stage_statement
    stage: (identifier) @attribute)
]

(interval_declaration
  name: (identifier) @type)

(interval_value
  name: (identifier) @constant)

(comparison
  right: (identifier) @constant)

(assume_statement
  value: (identifier) @constant)

[
  (preshader_variable
    name: (identifier) @variable.member)
  (swizzle_expression
    channels: (identifier) @variable.member)
  (struct_field
    name: (identifier) @variable.member)
]

(struct_field
  type: (identifier) @type)

(struct_field
  semantic: (identifier) @attribute)

[
  (sampler_state
    name: (identifier) @property)
  (variable_attribute
    name: (identifier) @property)
]

(hardware_condition
  feature: (identifier) @constant.builtin)

[
  (variable_type)
  (channel_type)
  (primitive_type)
] @type.builtin

(type_suffix) @type

(refined_block_tag) @attribute

(channel_modifier) @attribute

(state_name) @property

(channel_usage
  [
    "pos"
    "norm"
    "tc"
    "vcol"
    "extra"
  ] @constant.builtin)

[
  (builtin_matrix)
  "material"
  "hardware"
] @variable.builtin

(material_property
  [
    "diffuse"
    "emissive"
    "specular"
    "ambient"
  ] @variable.member)

(material_texture
  [
    "texture"
    "diffuse"
  ] @variable.member)

(number) @number

((number) @number.float
  (#match? @number.float "^([0-9]*[.][0-9]*([eE][+-]?[0-9]+)?|[0-9]+[eE][+-]?[0-9]+)$"))

(boolean) @boolean

[
  (null)
  (none)
  (render_flag)
] @constant.builtin

(string) @string

(include_directive
  path: (string) @string.special.path)

(comment) @comment

[
  "include"
  "include_optional"
] @keyword.import

[
  "macro"
  "define_macro_if_not_defined"
  "endmacro"
] @keyword.directive.define

[
  "##if"
  "##elif"
  "##else"
  "##endif"
  "##bool"
  "##declare"
  "##assert"
] @keyword.directive

[
  "if"
  "else"
] @keyword.conditional

"error" @keyword.exception

[
  "shader"
  "block"
  "interval"
  "sampler"
  "channel"
  "render_pass"
  "multi_render_pass"
  "subpass"
  "framebuffer_layout"
] @keyword.type

"bool" @type.builtin

(vector_expression
  "float4" @type.builtin)

[
  "literal"
  "static"
  "dynamic"
  "local"
  "always_referenced"
  "no_warnings"
] @keyword.modifier

[
  "hlsl"
  "compile"
  "assume"
  "assume_if_not_assumed"
  "supports"
  "pass"
  "register"
  "render_stage"
  "max_recursion"
  "allow_opacity_micromaps"
  "immediate_dword_count"
  "dont_render"
  "no_ablend"
  "render_trans"
  "no_dynstcode"
] @keyword

"maybe" @function.builtin

(shader_condition
  "shader" @variable.builtin)

[
  "="
  "=="
  "!="
  "<>"
  "<"
  "<="
  ">"
  ">="
  "!"
  "&&"
  "||"
  "+"
  "-"
  "*"
  "/"
  (token_concatenation)
] @operator

[
  "("
  ")"
  "["
  "]"
  "{"
  "}"
] @punctuation.bracket

[
  ","
  ";"
  ":"
  "."
] @punctuation.delimiter
