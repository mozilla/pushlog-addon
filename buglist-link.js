function createBuglist() {
	const bugs = new Set();
	const titlebar = document.querySelector('div.title');
	
	if (!titlebar) {
		return
	}
	titlebar.style = 'overflow:auto';

	//look for Bug # on page
	let result;
	let re = /Bug ([0-9]+)/ig;
	while ((result = re.exec(document.body.innerText)) !== null) {
		bugs.add(result[1]);
	}

	if (bugs.size === 0) {
		return;
	}

	//generate url for buglist link
	let url = 'https://bugzilla.mozilla.org/buglist.cgi?bug_id=';
	bugs.forEach(bug => {
		url += bug + ',';
	});

	//create buglist link
	let a = document.createElement('a');
	a.textContent = 'View as Buglist on Bugzilla';
	a.href = url;
	a.id = 'addon-buglist';
	a.style = 'float:right';

	titlebar.appendChild(a);
}

createBuglist();