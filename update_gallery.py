from __future__ import print_function

import argparse
from bs4 import BeautifulSoup

def update_branch_html(branch, title):

    with open('example/' + branch + '.html') as f:
        soup = BeautifulSoup(f)

        soup.title.string = 'Tideline: ' + title

        css_link = soup.find(href='example.css')
        css_link['href'] = branch + '.css'

        js_link = soup.find(src='bundle.js')
        js_link['src'] = branch + '.js'

    with open('example/' + branch + '.html', 'w') as f:
        f.write(soup.prettify())

def update_gallery_html(branch, title, desc):

    gallery_item = """
            <div class="row gallery-item">
                <h2 class="col-md-offset-1"></h2>
                <div class="col-md-8 col-md-offset-2">
                    <dl>
                      <dt><a href="%s" target="_blank" class="lead">%s</a></dt>
                      <dd>
                        <ul class="list-unstyled">
                            <li><p>%s</p></li>
                        </ul>
                      </dd>
                    </dl>
                </div>
            </div>""" %('example/' + branch + '.html', title, desc)

    with open('index.html') as f:
        soup = BeautifulSoup(f)

        gallery_head = soup.find(id='gallery')
        if gallery_head.div.h1.small != '':
            gallery_head.div.h1.string = 'Gallery'
        
        item_soup = BeautifulSoup(gallery_item)

        gallery_head.insert_after(item_soup)

    with open('index.html', 'w') as f:
        f.write(soup.prettify())

def main():
    parser = argparse.ArgumentParser(description='Update the main Jekyll page with new gallery links.')
    parser.add_argument('branch', action = 'store', help='REQUIRED! branch name')
    parser.add_argument('desc', action = 'store', help='REQUIRED! description of option encoded in branch')
    parser.add_argument('-t', '--title', action = 'store', dest = "title", help='title of option')

    args = parser.parse_args()

    if args.title:
        update_branch_html(args.branch, args.title)
        update_gallery_html(args.branch, args.title, args.desc)
    else:
        update_branch_html(args.branch, args.branch)
        update_gallery_html(args.branch, args.branch, args.desc)

if __name__ == '__main__':
    main()