var o = "foo bar baz٪☃🍣";
var m = "foobar"; for(var i = 0; i != 11; ++i) m+=m;
var m1 = m + m, m2 = m1 + m1, m3 = m2 + m2, m4 = m3 + m3;
var M1 = m + "𝑹" + m, M2 = M1 + "𝐀" +  M1, M3 = M2 + "𝓜" + M2, M4 = M3 + "𝙖" + M3;
var bits = [
	[ "foobar", -1628037227, 1 ],
	[ "foo bar baz", -228401567, 1 ],
	[ "foo bar baz٪", 984445192 ],
	[ "foo bar baz٪☃", 140429620],
	[ m, 40270464, 1 ],
	[ m1, -239917269, 1],
	[ m2, 2048324365, 1 ],
	[ m3, -1695517393, 1 ],
	[ m4, 1625284864, 1 ],
	[ M1, 642113519 ],
	[ M2, -1441250016 ],
	[ M3, -1101021992 ],
	[ M4, -1610723860 ],
	[ o, 1531648243 ],
	[ o+o, -218791105 ],
	[ o+o+o, 1834240887 ]
];
if(typeof module !== "undefined") module.exports = bits;
