import re
from setuptools import setup, find_packages

with open("requirements.txt") as f:
	install_requires = f.read().strip().split("\n")

# get version from __version__ variable in ecs_cheques/__init__.py without importing the package
with open("ecs_cheques/__init__.py") as f:
	match = re.search(r'^__version__\s*=\s*["\']([^"\']+)["\']', f.read(), re.MULTILINE)
	if not match:
		raise RuntimeError("Cannot find __version__ in ecs_cheques/__init__.py")
	version = match.group(1)

setup(
	name="ecs_cheques",
	version=version,
	description="Custom App For Cheques",
	author="erpcloud.systems",
	author_email="info@erpcloud.systems",
	packages=find_packages(),
	zip_safe=False,
	include_package_data=True,
	install_requires=install_requires
)
