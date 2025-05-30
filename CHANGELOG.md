# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-05-29

### Added
- **Builder Pattern API**: New fluent API for creating policies with `PolicyBuilder` and `StatementBuilder`
  - Simple mode: Chain methods like `.allow(['read']).on(['document/*'])`
  - Complex mode: Build multi-statement policies with `.statement()` method
  - Full validation with detailed error messages
- **Enhanced Documentation**: Comprehensive README with Table of Contents and Builder Pattern examples
- **New Examples**: Added `comprehensive-example.ts` demonstrating all library features
- **Direct User Policy Attachment**: New `attachPolicyToUser()` method for attaching policies directly to users
- **Complete Test Coverage**: Added comprehensive test suites for builder pattern and integration tests

### Changed
- **Version bump**: Updated package version from 1.1.0 to 1.2.0
- **Enhanced `createPolicy()` method**: Now accepts both traditional `Policy` objects and `PolicyBuilder` instances
- **Improved exports**: Added builder classes to main module exports

### Technical Details
- Added `builders/` directory with `PolicyBuilder`, `StatementBuilder`, and validation utilities
- Enhanced `AccessControl.createPolicy()` with automatic builder-to-policy conversion
- Maintained full backward compatibility with existing Policy object approach
- Added builder validation with `BuilderValidationError` for detailed error reporting

### Backward Compatibility
- ✅ All existing APIs remain unchanged
- ✅ Traditional Policy object approach fully supported
- ✅ No breaking changes to existing functionality