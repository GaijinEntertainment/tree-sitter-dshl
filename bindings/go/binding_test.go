package tree_sitter_dshl_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_dshl "github.com/GaijinEntertainment/tree-sitter-dshl/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	parser := tree_sitter.NewParser()
	defer parser.Close()

	if err := parser.SetLanguage(tree_sitter.NewLanguage(tree_sitter_dshl.Language())); err != nil {
		t.Errorf("Error loading DSHL grammar: %v", err)
	}
}
