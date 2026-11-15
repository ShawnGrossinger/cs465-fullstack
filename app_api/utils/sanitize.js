'use strict';
/**
 * HTML sanitization for trip descriptions.
 *
 * Descriptions are allowed to contain simple formatting, so they cannot just
 * be escaped. Instead they are filtered against an allowlist: only the tags
 * below survive, every attribute is removed (no onerror=, no style=, no
 * href="javascript:..."), and the contents of <script> and <style> are dropped.
 *
 * The same policy runs twice: when a trip is written (so nothing unsafe is
 * stored) and when the customer site renders it (so data that was stored
 * before this change, or written directly to the database, is still safe).
 */
const sanitizeHtml = require('sanitize-html');

const DESCRIPTION_POLICY = Object.freeze({
    allowedTags: ['p', 'br', 'b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li'],
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
});

function sanitizeDescription(html) {
    if (html === undefined || html === null) return '';
    return sanitizeHtml(String(html), DESCRIPTION_POLICY).trim();
}

module.exports = { sanitizeDescription, DESCRIPTION_POLICY };
