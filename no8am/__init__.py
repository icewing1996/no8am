from flask import Flask
from flask_assets import Environment
from flask_cdn import CDN
import os

app = Flask(__name__)

secret_key = os.environ.get("SECRET_KEY") or "something_super_secret"
APPLICATION_ROOT = os.environ.get('APPLICATION_ROOT') or ""
STATIC_LOCATION = os.environ.get('STATIC_LOCATION') or "local"
SIMPLE_FORM_TOKEN = os.environ.get("SIMPLE_FORM_TOKEN")
CLOUDFRONT_DISTRIBUTION_ID = os.environ.get("CLOUDFRONT_DISTRIBUTION_ID")
REDIS_PASS = os.environ.get("REDIS_PASS")
REDIS_SERVER = os.environ.get("REDIS_SERVER")
use_cdn = not app.debug

app.config.update(
	SECRET_KEY=secret_key,
	CDN_DOMAIN="static.no8.am",
	CDN_HTTPS=True,
	CDN_TIMESTAMP=False,
	BROWSERIFY_BIN='./node_modules/.bin/browserifyinc',
	CLEANCSS_BIN='./node_modules/.bin/cleancss',
	CLEANCSS_EXTRA_ARGS=['--skip-rebase'],
	UGLIFYJS_BIN='./node_modules/.bin/uglifyjs',
	UGLIFYJS_EXTRA_ARGS=['-c', '-m'],
	FLASK_ASSETS_USE_CDN=use_cdn
)

assets = Environment(app)
CDN(app)

from no8am.metadata import DEPARTMENT_LIST, CCC_LIST, CREDIT_LIST
from no8am.cache import course_data_get, course_data_set
from no8am.database import store_link, get_link, generate_short_link
from no8am.utility import get_bucknell_format_semester, generate_course_descriptions, get_user_format_semester
from no8am.minify import update_static_files, generate_metadata, JS_OUTPUT_FILENAME
from no8am.scraper import Department, CreditOrCCC, find_course_in_department, fetch_section_details

import no8am.views
