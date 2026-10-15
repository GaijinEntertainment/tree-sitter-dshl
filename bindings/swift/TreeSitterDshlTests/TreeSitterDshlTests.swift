import XCTest
import SwiftTreeSitter
import TreeSitterDshl

final class TreeSitterDshlTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_dshl())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading DSHL grammar")
    }
}
