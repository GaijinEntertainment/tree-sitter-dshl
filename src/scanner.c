#include "tree_sitter/alloc.h"
#include "tree_sitter/parser.h"

#include <stdbool.h>
#include <stdint.h>
#include <string.h>

// constraint: the order matches the externals array in grammar.js
enum TokenType {
  HLSL_OPEN_BRACE,
  HLSL_CLOSE_BRACE,
  HLSL_CODE,
  DIRECTIVE_END,
  DIRECTIVE_ARGUMENTS,
  MACRO_FRAGMENT,
  ERROR_SENTINEL,
};

typedef struct {
  uint32_t depth;
  bool at_line_start;
} Scanner;

static const char *const DIRECTIVES[] = {"if", "elif", "else", "endif", "bool", "declare", "assert"};

static inline void advance(TSLexer *lexer) { lexer->advance(lexer, false); }

static inline void skip(TSLexer *lexer) { lexer->advance(lexer, true); }

static inline bool is_space(int32_t c) { return c == ' ' || c == '\t' || c == '\v' || c == '\f'; }

static inline bool is_line_end(int32_t c) { return c == '\n' || c == '\r'; }

static inline bool is_word_char(int32_t c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '_';
}

// Reads `##` and a directive name of the shader compiler at the lookahead `#`.
static bool consume_directive(TSLexer *lexer) {
  advance(lexer);
  if (lexer->lookahead != '#') {
    return false;
  }
  advance(lexer);
  while (is_space(lexer->lookahead)) {
    advance(lexer);
  }
  char word[8];
  size_t length = 0;
  while (is_word_char(lexer->lookahead)) {
    if (length == sizeof(word)) {
      return false;
    }
    word[length++] = (char)lexer->lookahead;
    advance(lexer);
  }
  for (size_t i = 0; i < sizeof(DIRECTIVES) / sizeof(DIRECTIVES[0]); i++) {
    if (strlen(DIRECTIVES[i]) == length && memcmp(DIRECTIVES[i], word, length) == 0) {
      return true;
    }
  }
  return false;
}

static void consume_string(TSLexer *lexer) {
  advance(lexer);
  while (!lexer->eof(lexer) && !is_line_end(lexer->lookahead) && lexer->lookahead != '"') {
    if (lexer->lookahead == '~') {
      advance(lexer);
      if (lexer->eof(lexer) || is_line_end(lexer->lookahead)) {
        return;
      }
    }
    advance(lexer);
  }
  if (lexer->lookahead == '"') {
    advance(lexer);
  }
}

static void consume_comment(TSLexer *lexer) {
  if (lexer->lookahead == '/') {
    while (!lexer->eof(lexer) && !is_line_end(lexer->lookahead)) {
      advance(lexer);
    }
    return;
  }
  advance(lexer);
  while (!lexer->eof(lexer)) {
    if (lexer->lookahead == '*') {
      advance(lexer);
      if (lexer->lookahead == '/') {
        advance(lexer);
        return;
      }
    } else {
      advance(lexer);
    }
  }
}

static bool scan_hlsl(Scanner *scanner, TSLexer *lexer, const bool *valid_symbols) {
  bool at_line_start = scanner->at_line_start;
  while (is_space(lexer->lookahead) || is_line_end(lexer->lookahead)) {
    if (is_line_end(lexer->lookahead)) {
      at_line_start = true;
    }
    skip(lexer);
  }
  if (lexer->eof(lexer)) {
    return false;
  }

  if (lexer->lookahead == '}' && scanner->depth == 0) {
    if (!valid_symbols[HLSL_CLOSE_BRACE]) {
      return false;
    }
    advance(lexer);
    lexer->mark_end(lexer);
    lexer->result_symbol = HLSL_CLOSE_BRACE;
    scanner->at_line_start = false;
    return true;
  }

  if (!valid_symbols[HLSL_CODE]) {
    return false;
  }
  if (at_line_start && lexer->lookahead == '#' && consume_directive(lexer)) {
    return false;
  }

  lexer->result_symbol = HLSL_CODE;
  while (!lexer->eof(lexer)) {
    int32_t c = lexer->lookahead;
    if (is_line_end(c)) {
      advance(lexer);
      lexer->mark_end(lexer);
      while (is_space(lexer->lookahead)) {
        advance(lexer);
      }
      if (lexer->lookahead == '#' && consume_directive(lexer)) {
        scanner->at_line_start = true;
        return true;
      }
    } else if (c == '{') {
      scanner->depth++;
      advance(lexer);
    } else if (c == '}') {
      if (scanner->depth == 0) {
        break;
      }
      scanner->depth--;
      advance(lexer);
    } else if (c == '/') {
      advance(lexer);
      if (lexer->lookahead == '/' || lexer->lookahead == '*') {
        consume_comment(lexer);
      }
    } else if (c == '"') {
      consume_string(lexer);
    } else {
      advance(lexer);
    }
  }
  lexer->mark_end(lexer);
  scanner->at_line_start = false;
  return true;
}

static bool scan_directive_end(TSLexer *lexer) {
  while (is_space(lexer->lookahead)) {
    skip(lexer);
  }
  if (lexer->eof(lexer) || is_line_end(lexer->lookahead) || lexer->lookahead == '}') {
    lexer->mark_end(lexer);
    lexer->result_symbol = DIRECTIVE_END;
    return true;
  }
  return false;
}

static bool scan_directive_arguments(TSLexer *lexer) {
  while (is_space(lexer->lookahead)) {
    skip(lexer);
  }
  bool has_text = false;
  while (!lexer->eof(lexer) && !is_line_end(lexer->lookahead)) {
    if (lexer->lookahead == '\\') {
      advance(lexer);
      if (lexer->lookahead == '\r') {
        advance(lexer);
      }
      if (lexer->lookahead == '\n') {
        advance(lexer);
      }
    } else {
      if (!is_space(lexer->lookahead)) {
        has_text = true;
      }
      advance(lexer);
      if (has_text) {
        lexer->mark_end(lexer);
      }
    }
  }
  if (!has_text) {
    return false;
  }
  lexer->result_symbol = DIRECTIVE_ARGUMENTS;
  return true;
}

static void consume_hlsl_text(TSLexer *lexer) {
  uint32_t depth = 0;
  while (!lexer->eof(lexer)) {
    int32_t c = lexer->lookahead;
    if (c == '{') {
      depth++;
      advance(lexer);
    } else if (c == '}') {
      advance(lexer);
      if (depth <= 1) {
        return;
      }
      depth--;
    } else if (c == '/') {
      advance(lexer);
      if (lexer->lookahead == '/' || lexer->lookahead == '*') {
        consume_comment(lexer);
      }
    } else if (c == '"') {
      consume_string(lexer);
    } else {
      advance(lexer);
    }
  }
}

// Reads the body of a macro definition to its `endmacro` and returns it as one token when its braces or parentheses
// do not balance, as in a macro that opens a block which another macro closes, or when it is a comma-separated list
// outside braces with no `;`, as in a macro that gives the values of an initializer list.
static bool scan_macro_fragment(TSLexer *lexer) {
  uint32_t braces = 0;
  uint32_t parens = 0;
  bool balanced = true;
  bool has_text = false;
  bool has_list = false;
  bool has_statement = false;
  for (;;) {
    while (is_space(lexer->lookahead) || is_line_end(lexer->lookahead)) {
      lexer->advance(lexer, !has_text);
    }
    if (lexer->eof(lexer)) {
      return false;
    }
    int32_t c = lexer->lookahead;
    if (c == '/') {
      lexer->advance(lexer, !has_text);
      if (lexer->lookahead == '/' || lexer->lookahead == '*') {
        if (has_text) {
          consume_comment(lexer);
        } else if (lexer->lookahead == '/') {
          while (!lexer->eof(lexer) && !is_line_end(lexer->lookahead)) {
            skip(lexer);
          }
        } else {
          skip(lexer);
          while (!lexer->eof(lexer)) {
            int32_t star = lexer->lookahead;
            skip(lexer);
            if (star == '*' && lexer->lookahead == '/') {
              skip(lexer);
              break;
            }
          }
        }
        continue;
      }
    } else if (c == '"') {
      consume_string(lexer);
    } else if (is_word_char(c)) {
      char word[9];
      size_t length = 0;
      while (is_word_char(lexer->lookahead)) {
        if (length < sizeof(word)) {
          word[length] = (char)lexer->lookahead;
        }
        length++;
        advance(lexer);
      }
      if (length == 8 && memcmp(word, "endmacro", 8) == 0) {
        break;
      }
      if (length == 4 && memcmp(word, "hlsl", 4) == 0) {
        lexer->mark_end(lexer);
        has_text = true;
        has_statement = true;
        while (is_space(lexer->lookahead) || is_line_end(lexer->lookahead)) {
          advance(lexer);
        }
        if (lexer->lookahead == '(') {
          while (!lexer->eof(lexer) && lexer->lookahead != ')' && lexer->lookahead != '{') {
            advance(lexer);
          }
          if (lexer->lookahead == ')') {
            advance(lexer);
          }
          while (is_space(lexer->lookahead) || is_line_end(lexer->lookahead)) {
            advance(lexer);
          }
        }
        if (lexer->lookahead == '{') {
          consume_hlsl_text(lexer);
        }
      }
    } else {
      bool top_level = braces == 0 && parens == 0;
      has_list = has_list || (top_level && c == ',');
      has_statement = has_statement || (top_level && (c == ';' || c == '{'));
      if (c == '{') {
        braces++;
      } else if (c == '(') {
        parens++;
      } else if (c == '}') {
        balanced = balanced && braces > 0;
        braces -= braces > 0;
      } else if (c == ')') {
        balanced = balanced && parens > 0;
        parens -= parens > 0;
      }
      advance(lexer);
    }
    has_text = true;
    lexer->mark_end(lexer);
  }
  bool is_list = has_list && !has_statement;
  if (!has_text || (balanced && braces == 0 && parens == 0 && !is_list)) {
    return false;
  }
  lexer->result_symbol = MACRO_FRAGMENT;
  return true;
}

void *tree_sitter_dshl_external_scanner_create(void) { return ts_calloc(1, sizeof(Scanner)); }

void tree_sitter_dshl_external_scanner_destroy(void *payload) { ts_free(payload); }

unsigned tree_sitter_dshl_external_scanner_serialize(void *payload, char *buffer) {
  Scanner *scanner = payload;
  memcpy(buffer, &scanner->depth, sizeof(scanner->depth));
  buffer[sizeof(scanner->depth)] = (char)scanner->at_line_start;
  return sizeof(scanner->depth) + 1;
}

void tree_sitter_dshl_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {
  Scanner *scanner = payload;
  scanner->depth = 0;
  scanner->at_line_start = false;
  if (length == sizeof(scanner->depth) + 1) {
    memcpy(&scanner->depth, buffer, sizeof(scanner->depth));
    scanner->at_line_start = buffer[sizeof(scanner->depth)] != 0;
  }
}

bool tree_sitter_dshl_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
  Scanner *scanner = payload;
  if (valid_symbols[ERROR_SENTINEL]) {
    return false;
  }

  if (valid_symbols[DIRECTIVE_END] && scan_directive_end(lexer)) {
    scanner->at_line_start = true;
    return true;
  }

  if (valid_symbols[MACRO_FRAGMENT]) {
    return scan_macro_fragment(lexer);
  }

  if (valid_symbols[DIRECTIVE_ARGUMENTS]) {
    if (!scan_directive_arguments(lexer)) {
      return false;
    }
    scanner->at_line_start = true;
    return true;
  }

  if (valid_symbols[HLSL_OPEN_BRACE]) {
    while (is_space(lexer->lookahead) || is_line_end(lexer->lookahead)) {
      skip(lexer);
    }
    if (lexer->lookahead != '{') {
      return false;
    }
    advance(lexer);
    lexer->mark_end(lexer);
    lexer->result_symbol = HLSL_OPEN_BRACE;
    scanner->depth = 0;
    scanner->at_line_start = true;
    return true;
  }

  if (valid_symbols[HLSL_CODE] || valid_symbols[HLSL_CLOSE_BRACE]) {
    return scan_hlsl(scanner, lexer, valid_symbols);
  }

  return false;
}
