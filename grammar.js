/**
 * @file Dagor Shader Language grammar for tree-sitter
 * @author Gaijin Entertainment
 * @author Anton Zinovyev <xog3@yandex.ru>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const VARIABLE_TYPES = [
  'const_buffer', 'tlas', 'buffer', 'texture', 'float4', 'int4', 'float4x4', 'float4x3', 'float', 'int',
];

const CHANNEL_TYPES = [
  'float1', 'float2', 'float3', 'float4', 'short2', 'short4', 'ubyte4', 'color8',
  'short2n', 'short4n', 'ushort2n', 'ushort4n', 'half2', 'half4', 'udec3', 'dec3n',
];

const CHANNEL_USAGES = ['pos', 'norm', 'tc', 'vcol', 'extra'];

const CHANNEL_MODIFIERS = [
  'signed_pack', 'unsigned_pack', 'mul_1k', 'mul_2k', 'mul_4k', 'mul_8k', 'mul_16k', 'mul_32767', 'bounding_pack',
];

const STATE_VARIABLES = [
  'blend_src', 'blend_dst', 'blend_asrc', 'blend_adst', 'blend_op', 'blend_aop', 'blend_factor', 'cull_mode',
  'alpha_to_coverage', 'view_instances', 'stencil', 'stencil_func', 'stencil_ref', 'stencil_pass', 'stencil_fail',
  'stencil_zfail', 'color_write', 'z_write', 'z_test', 'z_func',
];

const MATERIAL_COLORS = ['diffuse', 'emissive', 'specular', 'ambient'];

const BUILTIN_MATRICES = [
  'globtm', 'projtm', 'viewprojtm', 'local_view_x', 'local_view_y', 'local_view_z', 'local_view_pos',
  'world_local_x', 'world_local_y', 'world_local_z', 'world_local_pos',
];

const STRUCT_FIELD_TYPES = ['float', 'float1', 'float2', 'float3', 'float4', 'int', 'int4', 'half2', 'half4'];

const COMPARISON_OPERATORS = ['==', '!=', '<>', '<', '<=', '>', '>='];

export default grammar({
  name: 'dshl',

  extras: $ => [/\s/, $.comment],

  externals: $ => [
    $._hlsl_open_brace,
    $._hlsl_close_brace,
    $.hlsl_code,
    $._directive_end,
    $.directive_arguments,
    $.macro_fragment,
    $._error_sentinel,
  ],

  word: $ => $.identifier,

  supertypes: $ => [$._statement, $._expression, $._condition],

  conflicts: $ => [
    [$._render_target_format],
    [$.parameter_statement, $._hlsl_variable_name],
    [$.preshader_block, $._condition_value],
  ],

  rules: {
    source_file: $ => repeat($._statement),

    _statement: $ => choice(
      $.include_directive,
      $.macro_definition,
      $.macro_call,
      $.parameter_statement,
      $.shader_declaration,
      $.block_declaration,
      $.render_pass_declaration,
      $.render_pass_group_declaration,
      $.framebuffer_layout_declaration,
      $.variable_declaration,
      $.sampler_declaration,
      $.interval_declaration,
      $.bool_declaration,
      $.assume_statement,
      $.hlsl_block,
      $.if_statement,
      $.state_statement,
      $.preshader_block,
      $.preshader_variable,
      $.immediate_dword_count_statement,
      $.channel_declaration,
      $.supports_statement,
      $.directive,
      $.render_stage_statement,
      $.raytracing_statement,
      $.error_statement,
      $.pass_statement,
      $.compile_statement,
    ),

    include_directive: $ => seq(
      choice('include', 'include_optional'),
      field('path', $.string),
    ),

    macro_definition: $ => seq(
      choice('macro', 'define_macro_if_not_defined'),
      field('name', $.identifier),
      field('parameters', $.macro_parameters),
      optional(field('body', choice($.macro_body, $.macro_fragment))),
      'endmacro',
    ),

    macro_body: $ => choice(
      repeat1($._statement),
      $.binary_condition,
      $.not_condition,
      $.comparison,
      $.hardware_condition,
      $.shader_condition,
      $.boolean,
      $.maybe_condition,
      $.parenthesized_condition,
    ),

    macro_parameters: $ => seq('(', commaSep($.identifier), ')'),

    macro_call: $ => prec.right(seq(
      field('macro', $.identifier),
      field('arguments', $.macro_arguments),
      optional(';'),
    )),

    parameter_statement: $ => prec.right(seq(field('parameter', $.identifier), optional(';'))),

    macro_arguments: $ => seq('(', commaSep(alias($._macro_argument, $.macro_argument)), ')'),

    _macro_argument: $ => repeat1(choice($._macro_token, $._macro_group)),

    _macro_group: $ => seq('(', repeat(choice($._macro_token, ',', $._macro_group)), ')'),

    _macro_token: $ => choice(
      $.identifier,
      $.number,
      $.string,
      $.hlsl_block,
      $.type_suffix,
      $.refined_block_tag,
      $.token_concatenation,
      '{', '}', '[', ']', '.', ';', ':', '=', '!', '||', '&&', '+', '-', '*', '/',
      ...COMPARISON_OPERATORS,
    ),

    token_concatenation: _ => '##',

    shader_declaration: $ => seq(
      'shader',
      commaSep1(field('name', $.identifier)),
      field('body', $.statement_block),
    ),

    block_declaration: $ => seq(
      'block',
      '(',
      field('scope', $.identifier),
      ')',
      field('name', $.identifier),
      field('body', $.statement_block),
    ),

    statement_block: $ => seq('{', repeat($._statement), '}'),

    variable_declaration: $ => seq(
      optional(field('modifier', choice('literal', 'static', 'dynamic', 'local'))),
      field('type', $.variable_type),
      field('name', $.identifier),
      optional(field('size', $.array_size)),
      optional(seq('=', field('value', choice($._expression, $.material_property, $.initializer_list)))),
      optional('no_warnings'),
      repeat(field('attribute', $.variable_attribute)),
      optional('always_referenced'),
      ';',
    ),

    variable_type: _ => choice(...VARIABLE_TYPES),

    array_size: $ => seq('[', $._integer, ']'),

    _integer: $ => choice($.number, $.identifier),

    initializer_list: $ => seq('{', commaSep1($._expression), '}'),

    variable_attribute: $ => seq(
      field('name', $.identifier),
      '=',
      field('value', $._expression),
    ),

    material_property: $ => seq(
      'material',
      '.',
      choice(
        field('color', choice(...MATERIAL_COLORS)),
        field('texture', $.material_texture),
      ),
    ),

    material_texture: $ => seq(
      'texture',
      choice(
        seq('.', 'diffuse'),
        seq('[', field('index', $._integer), ']'),
      ),
    ),

    sampler_declaration: $ => seq(
      'sampler',
      field('name', $.identifier),
      optional(field('body', $.sampler_body)),
      optional('always_referenced'),
      ';',
    ),

    sampler_body: $ => seq('{', repeat1($.sampler_state), '}'),

    sampler_state: $ => seq(
      field('name', $.identifier),
      '=',
      field('value', $._expression),
      ';',
    ),

    interval_declaration: $ => seq(
      'interval',
      field('name', $.identifier),
      ':',
      repeat1(field('value', $.interval_value)),
      field('value', alias($.last_interval_value, $.interval_value)),
      optional('always_referenced'),
      ';',
    ),

    last_interval_value: $ => field('name', $.identifier),

    interval_value: $ => seq(
      field('name', $.identifier),
      '<',
      field('bound', choice($._signed_number, $.identifier)),
      ',',
    ),

    bool_declaration: $ => seq(
      'bool',
      field('name', $.identifier),
      '=',
      field('value', $._condition),
      ';',
    ),

    assume_statement: $ => seq(
      choice('assume', 'assume_if_not_assumed'),
      field('interval', $.identifier),
      choice(
        seq('=', field('value', choice($.identifier, $.null))),
        seq('!=', field('value', $.null)),
      ),
      ';',
    ),

    hlsl_block: $ => seq(
      'hlsl',
      optional(seq('(', field('stage', $.identifier), ')')),
      alias($._hlsl_open_brace, '{'),
      optional(field('body', $.hlsl_body)),
      alias($._hlsl_close_brace, '}'),
    ),

    hlsl_body: $ => repeat1(choice(
      $.hlsl_code,
      $.hlsl_if_directive,
      $.hlsl_elif_directive,
      $.hlsl_else_directive,
      $.hlsl_endif_directive,
      $.hlsl_bool_directive,
      $.hlsl_declare_directive,
      $.hlsl_assert_directive,
    )),

    hlsl_if_directive: $ => seq(
      directive('if'),
      field('condition', $._condition),
      $._directive_end,
    ),

    hlsl_elif_directive: $ => seq(
      directive('elif'),
      field('condition', $._condition),
      $._directive_end,
    ),

    hlsl_else_directive: _ => directive('else'),

    hlsl_endif_directive: _ => directive('endif'),

    hlsl_bool_directive: $ => seq(
      directive('bool'),
      field('name', $.identifier),
      $._directive_end,
    ),

    hlsl_declare_directive: $ => seq(
      directive('declare'),
      field('interval', $.identifier),
      $._directive_end,
    ),

    hlsl_assert_directive: $ => seq(
      directive('assert'),
      field('arguments', $.directive_arguments),
    ),

    if_statement: $ => seq(
      'if',
      '(',
      field('condition', $._condition),
      ')',
      field('consequence', $.statement_block),
      optional(field('alternative', $.else_clause)),
    ),

    else_clause: $ => seq('else', choice($.statement_block, $.if_statement, $.macro_call)),

    state_statement: $ => choice(
      seq(
        field('state', alias(choice(...STATE_VARIABLES), $.state_name)),
        optional(seq('[', field('index', $._integer), ']')),
        '=',
        optional('static'),
        field('value', choice($._state_value, $.vector_expression)),
        ';',
      ),
      seq(
        field('state', alias(choice('z_bias', 'slope_z_bias'), $.state_name)),
        '=',
        field('value', choice($.identifier, $._signed_number)),
        ';',
      ),
    ),

    _state_value: $ => choice($.identifier, $.none, $.boolean, $.number),

    preshader_block: $ => seq(
      '(',
      field('stage', $.identifier),
      ')',
      field('body', $.statement_block),
      optional(';'),
    ),

    immediate_dword_count_statement: $ => seq(
      'immediate_dword_count',
      '=',
      field('count', $._integer),
      ';',
    ),

    preshader_variable: $ => prec.right(seq(
      field('name', $._hlsl_variable_name),
      field('type', choice($.type_suffix, $.identifier)),
      optional(field('tag', $.refined_block_tag)),
      choice(
        seq(
          optional(seq('[', optional(field('size', choice($.identifier, $.number))), ']')),
          choice(
            seq('=', field('value', choice($._preshader_value, $.initializer_list))),
            seq(':', field('register', $.register)),
          ),
          optional(field('declaration', $.hlsl_block)),
          optional(';'),
        ),
        seq(field('body', $.preshader_struct), optional(';')),
      ),
    )),

    _hlsl_variable_name: $ => choice(
      $.identifier,
      alias(choice('diffuse', 'specular', ...BUILTIN_MATRICES), $.identifier),
    ),

    _preshader_value: $ => choice(
      alias(choice(...BUILTIN_MATRICES), $.builtin_matrix),
      $.material_texture_reference,
      $._expression,
    ),

    material_texture_reference: $ => prec.right(seq(
      'material',
      '.',
      field('texture', $.material_texture),
      repeat(field('attribute', $.variable_attribute)),
    )),

    register: $ => seq('register', '(', field('index', choice($.identifier, $.number)), ')'),

    preshader_struct: $ => seq('{', repeat($.struct_field), '}'),

    struct_field: $ => seq(
      field('type', choice($.identifier, alias(choice(...STRUCT_FIELD_TYPES), $.primitive_type))),
      field('name', $.identifier),
      ':',
      field('semantic', $.identifier),
      optional(field('semantic', $.identifier)),
      ';',
    ),

    channel_declaration: $ => seq(
      'channel',
      field('type', alias(choice(...CHANNEL_TYPES), $.channel_type)),
      field('usage', $.channel_usage),
      '=',
      field('source', $.channel_usage),
      optional(field('modifier', alias(choice(...CHANNEL_MODIFIERS), $.channel_modifier))),
      ';',
    ),

    channel_usage: $ => seq(
      choice(...CHANNEL_USAGES),
      optional(seq('[', field('index', $._integer), ']')),
    ),

    supports_statement: $ => seq(
      'supports',
      commaSep1(field('block', choice($.identifier, $.none))),
      ';',
    ),

    directive: _ => seq(choice('dont_render', 'no_ablend', 'render_trans', 'no_dynstcode'), ';'),

    render_stage_statement: $ => seq(
      'render_stage',
      field('stage', choice($.identifier, $.string)),
      ';',
    ),

    raytracing_statement: $ => choice(
      seq('max_recursion', '=', field('value', $._integer), ';'),
      seq('allow_opacity_micromaps', ';'),
    ),

    error_statement: $ => seq('error', '(', field('message', choice($.string, $.identifier)), ')', ';'),

    pass_statement: $ => seq(
      choice('pass', 'subpass', 'render_pass'),
      choice(
        $.subpass_reference,
        $.any_of,
      ),
      ';',
    ),

    subpass_reference: $ => seq(
      field('pass', $.identifier),
      optional(seq('.', field('subpass', $.identifier))),
    ),

    any_of: $ => seq(
      field('function', $.identifier),
      '(',
      commaSep1(field('member', $.subpass_reference)),
      ')',
    ),

    compile_statement: $ => seq(
      'compile',
      '(',
      field('profile', choice($.string, $.identifier)),
      ',',
      field('entry', choice($.string, $.identifier)),
      ')',
      optional(';'),
    ),

    render_pass_declaration: $ => seq(
      choice('render_pass', 'multi_render_pass'),
      field('name', $.identifier),
      field('body', $.render_pass_body),
    ),

    render_pass_body: $ => seq('{', repeat($._render_pass_statement), '}'),

    _render_pass_statement: $ => choice(
      alias($.render_pass_if_statement, $.if_statement),
      $.render_pass_flag,
      $.render_target_declaration,
      $.subpass_declaration,
      $.attachment_list,
    ),

    render_pass_if_statement: $ => seq(
      'if',
      '(',
      field('condition', $._condition),
      ')',
      field('consequence', $.render_pass_body),
      optional(field('alternative', alias($.render_pass_else_clause, $.else_clause))),
    ),

    render_pass_else_clause: $ => seq(
      'else',
      choice($.render_pass_body, alias($.render_pass_if_statement, $.if_statement)),
    ),

    render_pass_flag: $ => seq(field('name', $.identifier), ';'),

    render_target_declaration: $ => seq(
      optional(field('qualifier', $.identifier)),
      field('kind', $.identifier),
      field('name', $.identifier),
      optional($._render_target_tail),
      ';',
    ),

    subpass_declaration: $ => choice(
      seq('subpass', field('name', $.identifier), choice(';', field('body', $.subpass_body))),
      seq(field('kind', $.identifier), field('name', $.identifier), field('body', $.subpass_body)),
    ),

    subpass_body: $ => seq('{', repeat($._subpass_statement), '}'),

    _subpass_statement: $ => choice(
      alias($.subpass_if_statement, $.if_statement),
      $.attachment_list,
    ),

    subpass_if_statement: $ => seq(
      'if',
      '(',
      field('condition', $._condition),
      ')',
      field('consequence', $.subpass_body),
      optional(field('alternative', alias($.subpass_else_clause, $.else_clause))),
    ),

    subpass_else_clause: $ => seq(
      'else',
      choice($.subpass_body, alias($.subpass_if_statement, $.if_statement)),
    ),

    attachment_list: $ => seq(
      field('kind', $.identifier),
      '(',
      commaSep1(field('attachment', $.attachment)),
      ')',
      ';',
    ),

    attachment: $ => seq(
      optional(field('qualifier', $.identifier)),
      field('name', $.identifier),
      optional($._render_target_tail),
    ),

    _render_target_tail: $ => choice(
      seq('=', $._render_target_format, optional(field('resolve', $.resolve))),
      field('resolve', $.resolve),
    ),

    _render_target_format: $ => seq(
      field('format', $.identifier),
      optional(field('samples', $.identifier)),
    ),

    resolve: $ => seq(
      field('function', $.identifier),
      '(',
      field('target', $.identifier),
      optional(seq('=', $._render_target_format)),
      ')',
    ),

    render_pass_group_declaration: $ => seq(
      choice('subpass', 'render_pass', 'multi_render_pass'),
      field('name', $.identifier),
      '=',
      field('value', $.any_of),
      ';',
    ),

    framebuffer_layout_declaration: $ => seq(
      'framebuffer_layout',
      field('name', $.identifier),
      choice(
        field('body', $.framebuffer_layout_body),
        seq('=', field('value', $.framebuffer_layout_any_of), ';'),
      ),
    ),

    framebuffer_layout_any_of: $ => seq(
      field('function', $.identifier),
      '(',
      commaSep1(field('member', $.identifier)),
      ')',
    ),

    framebuffer_layout_body: $ => seq('{', repeat($._framebuffer_layout_statement), '}'),

    _framebuffer_layout_statement: $ => choice(
      alias($.framebuffer_layout_if_statement, $.if_statement),
      $.framebuffer_target,
    ),

    framebuffer_layout_if_statement: $ => seq(
      'if',
      '(',
      field('condition', $._condition),
      ')',
      field('consequence', $.framebuffer_layout_body),
      optional(field('alternative', alias($.framebuffer_layout_else_clause, $.else_clause))),
    ),

    framebuffer_layout_else_clause: $ => seq(
      'else',
      choice($.framebuffer_layout_body, alias($.framebuffer_layout_if_statement, $.if_statement)),
    ),

    framebuffer_target: $ => seq(
      field('name', $.identifier),
      '=',
      $._render_target_format,
      ';',
    ),

    _condition: $ => choice(
      $.binary_condition,
      $.not_condition,
      $._condition_value,
    ),

    binary_condition: $ => choice(
      prec.left(1, seq(field('left', $._condition), field('operator', '||'), field('right', $._condition))),
      prec.left(2, seq(field('left', $._condition), field('operator', '&&'), field('right', $._condition))),
    ),

    not_condition: $ => seq('!', field('operand', $._condition_value)),

    _condition_value: $ => choice(
      $.comparison,
      $.hardware_condition,
      $.shader_condition,
      $.boolean,
      alias(choice('two_sided', 'real_two_sided'), $.render_flag),
      $.maybe_condition,
      $.parenthesized_condition,
      $.identifier,
      alias($.macro_call_condition, $.macro_call),
    ),

    comparison: $ => seq(
      field('left', $.identifier),
      field('operator', choice(...COMPARISON_OPERATORS)),
      field('right', choice($.identifier, $.null)),
    ),

    shader_condition: $ => seq(
      'shader',
      field('operator', choice(...COMPARISON_OPERATORS)),
      field('right', $.identifier),
    ),

    hardware_condition: $ => seq('hardware', '.', field('feature', $.identifier)),

    maybe_condition: $ => seq('maybe', '(', field('variable', $.identifier), ')'),

    parenthesized_condition: $ => seq('(', $._condition, ')'),

    macro_call_condition: $ => seq(
      field('macro', $.identifier),
      field('arguments', $.macro_arguments),
    ),

    _expression: $ => choice(
      $.binary_expression,
      $._operand,
    ),

    binary_expression: $ => choice(
      prec.left(1, seq(field('left', $._expression), field('operator', choice('+', '-')), field('right', $._expression))),
      prec.left(2, seq(field('left', $._expression), field('operator', choice('*', '/')), field('right', $._expression))),
    ),

    _operand: $ => choice(
      $.unary_expression,
      $.swizzle_expression,
      $._primary_expression,
    ),

    unary_expression: $ => prec(3, seq(
      field('operator', choice('+', '-')),
      field('operand', choice($.swizzle_expression, $._primary_expression)),
    )),

    swizzle_expression: $ => prec(4, seq(
      field('operand', $._primary_expression),
      '.',
      field('channels', $.identifier),
    )),

    _primary_expression: $ => choice(
      $.identifier,
      $.number,
      $.function_call,
      $.vector_expression,
      $.parenthesized_expression,
    ),

    function_call: $ => prec(5, seq(
      field('function', $.identifier),
      '(',
      optional(commaSep1(field('argument', $._expression))),
      ')',
    )),

    vector_expression: $ => choice(
      seq('float4', '(', commaSep1(field('component', $._expression)), ')'),
      seq('(', field('component', $._expression), repeat1(seq(',', field('component', $._expression))), ')'),
    ),

    parenthesized_expression: $ => seq('(', $._expression, ')'),

    _signed_number: $ => choice($.number, alias($.signed_number, $.unary_expression)),

    signed_number: $ => seq(field('operator', choice('+', '-')), field('operand', $.number)),

    type_suffix: _ => /@[a-zA-Z_][a-zA-Z0-9_]*/,

    refined_block_tag: _ => '#rb',

    identifier: _ => /[a-zA-Z_][a-zA-Z0-9_]*/,

    number: _ => {
      const decimal = /[0-9]+/;
      const hex = choice(/0[xX][0-9a-fA-F]+/, /[0-9][0-9a-fA-F]*[hH]/);
      const exponent = /[eE][+-]?[0-9]+/;
      const fraction = choice(/[0-9]*\.[0-9]+/, /[0-9]+\./);
      return token(choice(
        decimal,
        hex,
        seq(fraction, optional(exponent)),
        seq(/[0-9]+/, exponent),
      ));
    },

    string: _ => token(seq('"', repeat(choice(/~[^\r\n]/, /[^"~\r\n]/)), '"')),

    boolean: _ => choice('true', 'false'),

    null: _ => 'NULL',

    none: _ => 'none',

    comment: _ => token(choice(
      seq('//', /[^\r\n]*/),
      seq('/*', /[^*]*\*+([^/*][^*]*\*+)*/, '/'),
    )),
  },
});

/**
 * @param {string} name
 * @returns {AliasRule}
 */
function directive(name) {
  return alias(token(seq('##', /[ \t]*/, name)), `##${name}`);
}

/**
 * @param {RuleOrLiteral} rule
 * @returns {SeqRule}
 */
function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)));
}

/**
 * @param {RuleOrLiteral} rule
 * @returns {ChoiceRule}
 */
function commaSep(rule) {
  return optional(commaSep1(rule));
}
