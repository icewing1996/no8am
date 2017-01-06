from flask import render_template, request, jsonify, redirect, url_for, session
import requests
import sys
import os
import httplib
from functools import wraps
import json

from no8am import app, store_link, get_link, generate_short_link, JS_FILES, Department, CreditOrCCC, \
	find_course_in_department, fetch_section_details, get_user_format_semester, generate_metadata, \
	CCC_LIST, CREDIT_LIST, DEPARTMENT_LIST

reload(sys)
sys.setdefaultencoding('utf-8')

APPLICATION_ROOT = os.environ.get('APPLICATION_ROOT') or ""
STATIC_LOCATION = os.environ.get('STATIC_LOCATION') or "local"

SIMPLE_FORM_TOKEN = os.environ.get("SIMPLE_FORM_TOKEN")


def handle_response_errors(api_arguments):
	"""
	Decorator to return the correct HTTP errors in API responses.
	"""

	def handle_response_errors_decorator(api_function):

		@wraps(api_function)
		def wrapper():
			# TODO - also validate departments, CCC, and other inputs server side using metadata file

			# find arguments missing from API call
			missing_arguments = set(api_arguments) - set(request.args.keys())

			try:
				# find missing arguments
				if len(missing_arguments) > 0:
					raise RuntimeError("Missing the following arguments: " + str(list(missing_arguments)))

				# retrieve argument values and pass them to the API function
				return api_function(*map(request.args.get, api_arguments))

			except RuntimeError as error:
				# let the user know about a malformed API call
				return jsonify(error=error.message), httplib.BAD_REQUEST

			except Exception:
				return '', httplib.BAD_REQUEST

		return wrapper

	return handle_response_errors_decorator


@app.route('/')
def index():
	return render_template(
		'index.html', ASSET_URL="app.js", APP_ROOT=APPLICATION_ROOT, jsFiles=JS_FILES, STATIC_LOCATION=STATIC_LOCATION
	)


@app.route('/bucknell/')
@app.route('/bucknell/<config>')
def bucknell(config=None):
	if config:
		# Verify that custom link is valid
		response = get_link(config)
		if "Item" in response.keys():
			# store course data in cookie and redirect to /bucknell/
			session['custom_data'] = response["Item"]["schedule"]["S"]
		return redirect(url_for('bucknell'))
	else:
		custom_data = json.loads(session.pop('custom_data', 'null'))
		metadata = generate_metadata() if STATIC_LOCATION == 'local' else None
		return render_template(
			'start.html', customData=custom_data, ASSET_URL="app.js", CURRENT_SEMESTER=get_user_format_semester(),
			APP_ROOT=APPLICATION_ROOT, STATIC_LOCATION=STATIC_LOCATION, jsFiles=JS_FILES, metadata=metadata
		)


@app.route('/course')
@app.route('/course/<department>')
@app.route('/course/<department>/<course_number>')
def course_lookup(department=None, course_number=None):

	# return metadata if no parameters are provided
	if department is None and course_number is None:
		return jsonify(departments=DEPARTMENT_LIST)

	cache_time, department_data = Department.process_department_request(department)

	# return all courses in department
	if course_number is None:
		return jsonify(courses=department_data, cache_time=cache_time)

	# return data on specified course
	else:
		course_data = find_course_in_department(department_data, department, course_number)
		return jsonify(sections=course_data, cache_time=cache_time)


@app.route('/category/<category>')
@app.route('/category/<category>/<lookup_val>')
def other_lookup(category, lookup_val=None):

	category = category.lower()

	# provide metadata if lookup value is not specified
	if category == 'ccc' and lookup_val is None:
		return jsonify(ccc=CCC_LIST)

	elif category == 'credit' and lookup_val is None:
		return jsonify(credit=CREDIT_LIST)

	# provide course data
	elif category in ['ccc', 'credit'] and lookup_val is not None:
		cache_time, all_courses = CreditOrCCC.process_ccc_or_credit_request(category, lookup_val)
		return jsonify(courses=all_courses, cache_time=cache_time)

	# invalid lookup type
	else:
		return jsonify(error="Category should be either 'ccc' or 'credit'")


@app.route('/sectiondetails/')
@handle_response_errors(['crn', 'department'])
def get_details(crn, department):
	cache_time, section_details = fetch_section_details(crn, department)
	return jsonify(section_details=section_details, cache_time=cache_time)


@app.route('/storeConfig/')
@handle_response_errors(['config'])
def store_course_configuration(config):
	link = generate_short_link()
	store_link(link, config)
	return jsonify(shortLink=link)


@app.route('/reportError/')
@handle_response_errors(['courseNum', 'name', 'email', 'useragent'])
def report_error(courseNum, name, email, useragent):
	ip = request.remote_addr

	payload = {
		'courseNum': courseNum,
		'name': name,
		'email': email,
		'useragent': useragent,
		'ip': ip,
		'form_api_token': SIMPLE_FORM_TOKEN
	}

	requests.post("http://getsimpleform.com/messages", data=payload)
	return '', httplib.NO_CONTENT


@app.errorhandler(httplib.NOT_FOUND)
def page_not_found(error):
	return render_template(
		'404.html', ASSET_URL="packed.js", APP_ROOT=APPLICATION_ROOT, STATIC_LOCATION=STATIC_LOCATION
	), httplib.NOT_FOUND
