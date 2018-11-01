var bugs = [];

function createBuglist() {
	//look for Bug # on page
	let result;
	let re = /Bug ([0-9]+)/ig;
	while ((result = re.exec(document.body.innerText)) !== null) {
		bugs.push(result[1]);
	}
	//consolidate Bug #
	bugs = new Set(bugs);

	if (bugs.size === 0) {
		return;
	}

	var title = document.getElementsByClassName('title');
	var titlebar = title[0];
	titlebar.style = 'overflow:auto';

	let a = document.createElement('a');
	a.textContent = 'View as Buglist on Bugzilla';
	a.href = 'https://bugzilla.mozilla.org/buglist.cgi?bug_id=';
	a.id = 'addon-buglist';
	a.style = 'float:right';

	//create generic buglist-link
	titlebar.appendChild(a);

	//fill link to buglist with data
	for (let bug of bugs) {
		let a = document.getElementById('addon-buglist');
		a.href += bug + ",";
	}
}

createBuglist();