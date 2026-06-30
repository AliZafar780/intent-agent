# Security Policy

## Reporting a Vulnerability

We take the security of intent-agent seriously. If you believe you have found a security vulnerability, please report it to us through coordinated disclosure.

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please use GitHub's private vulnerability reporting feature or contact the repository owner directly.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Security Measures

- All API endpoints are rate-limited
- SQL injection prevention via parameterized queries
- Input validation and sanitization on all user inputs
- Security headers set via middleware (CSP, HSTS, XFO, etc.)
- Auth0 integration for authentication
- Prompt injection detection patterns implemented
- Step-up authentication for sensitive operations