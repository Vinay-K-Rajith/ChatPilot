describe('Knowledge Base', () => {
  beforeEach(() => {
    // Visit the knowledge base page
    cy.visit('/knowledge-base');
    
    // Wait for the page to load
    cy.get('[data-testid="knowledge-card-"] article, [data-testid="fab-create-article"], [data-testid="button-create-article"]', { timeout: 10000 }).should('exist');
  });

  describe('Article Management', () => {
    it('should create a new article using the header button (desktop)', () => {
      // Only test on desktop viewport
      cy.viewport(1280, 720);
      
      // Click create article button in header
      cy.get('[data-testid="button-create-article"]').should('be.visible').click();
      
      // Fill out the form
      cy.get('input[id="query"]').type('Test Article Title');
      cy.get('textarea[id="content"]').type('This is a test article content with some detailed information about the topic.');
      
      // Select a category
      cy.get('[role="combobox"]').first().click();
      cy.get('[role="option"]').contains('Technical').click();
      
      // Submit the form
      cy.get('button').contains('Create Article').click();
      
      // Verify article was created
      cy.contains('Test Article Title').should('be.visible');
      cy.contains('Technical').should('be.visible');
    });

    it('should create a new article using FAB (mobile)', () => {
      // Test on mobile viewport
      cy.viewport(375, 667);
      
      // Click floating action button
      cy.get('[data-testid="fab-create-article"]').should('be.visible').click();
      
      // Fill out the form
      cy.get('input[id="query"]').type('Mobile Test Article');
      cy.get('textarea[id="content"]').type('This article was created from mobile device.');
      
      // Submit the form
      cy.get('button').contains('Create Article').click();
      
      // Verify article was created
      cy.contains('Mobile Test Article').should('be.visible');
    });

    it('should edit an existing article by clicking on the card', () => {
      // Create an article first
      cy.get('[data-testid="button-create-article"], [data-testid="fab-create-article"]').first().click();
      cy.get('input[id="query"]').type('Article to Edit');
      cy.get('textarea[id="content"]').type('Original content');
      cy.get('button').contains('Create Article').click();
      
      // Wait for article to appear and click on it
      cy.contains('Article to Edit').should('be.visible').click();
      
      // Verify edit form opens
      cy.contains('Edit Article').should('be.visible');
      
      // Modify the content
      cy.get('input[id="query"]').clear().type('Edited Article Title');
      cy.get('textarea[id="content"]').clear().type('Updated content with new information.');
      
      // Save changes
      cy.get('button').contains('Update Article').click();
      
      // Verify changes were saved
      cy.contains('Edited Article Title').should('be.visible');
    });

    it('should delete an article from the edit form', () => {
      // Create an article first
      cy.get('[data-testid="button-create-article"], [data-testid="fab-create-article"]').first().click();
      cy.get('input[id="query"]').type('Article to Delete');
      cy.get('textarea[id="content"]').type('This article will be deleted');
      cy.get('button').contains('Create Article').click();
      
      // Click on the article to edit
      cy.contains('Article to Delete').click();
      
      // Click delete button
      cy.get('button').contains('Delete').click();
      
      // Confirm deletion
      cy.window().then((win) => {
        cy.stub(win, 'confirm').returns(true);
      });
      
      // Verify article was deleted
      cy.contains('Article to Delete').should('not.exist');
    });

    it('should handle keyboard shortcut (Ctrl+S) to save', () => {
      // Create new article
      cy.get('[data-testid="button-create-article"], [data-testid="fab-create-article"]').first().click();
      
      // Fill form
      cy.get('input[id="query"]').type('Keyboard Shortcut Test');
      cy.get('textarea[id="content"]').type('Testing Ctrl+S shortcut');
      
      // Use keyboard shortcut
      cy.get('body').type('{ctrl+s}');
      
      // Verify article was saved
      cy.contains('Keyboard Shortcut Test').should('be.visible');
    });

    it('should validate required fields', () => {
      // Open create form
      cy.get('[data-testid="button-create-article"], [data-testid="fab-create-article"]').first().click();
      
      // Try to submit without filling required fields
      cy.get('button').contains('Create Article').click();
      
      // Check for validation errors
      cy.contains('Keywords/Title is required').should('be.visible');
      cy.contains('Content is required').should('be.visible');
    });
  });

  describe('Search and Filter', () => {
    beforeEach(() => {
      // Create some test articles for search/filter tests
      const articles = [
        { title: 'JavaScript Tutorial', content: 'Learn JavaScript basics', category: 'Technical' },
        { title: 'API Documentation', content: 'REST API guide', category: 'Documentation' },
        { title: 'Project Setup', content: 'How to set up the project', category: 'Guidelines' }
      ];

      articles.forEach((article, index) => {
        cy.get('[data-testid="button-create-article"], [data-testid="fab-create-article"]').first().click();
        cy.get('input[id="query"]').type(article.title);
        cy.get('textarea[id="content"]').type(article.content);
        
        // Select category
        cy.get('[role="combobox"]').first().click();
        cy.get('[role="option"]').contains(article.category).click();
        
        cy.get('button').contains('Create Article').click();
        cy.wait(1000); // Wait between creations
      });
    });

    it('should search articles by title', () => {
      // Search for JavaScript
      cy.get('[data-testid="input-search-documents"]').type('JavaScript');
      
      // Wait for debounced search
      cy.wait(500);
      
      // Should show only JavaScript tutorial
      cy.contains('JavaScript Tutorial').should('be.visible');
      cy.contains('API Documentation').should('not.exist');
      cy.contains('Project Setup').should('not.exist');
    });

    it('should filter articles by category', () => {
      // Open category filter
      cy.get('[role="combobox"]').last().click();
      cy.get('[role="option"]').contains('Technical').click();
      
      // Should show only technical articles
      cy.contains('JavaScript Tutorial').should('be.visible');
      cy.contains('API Documentation').should('not.exist');
      cy.contains('Project Setup').should('not.exist');
    });

    it('should clear filters', () => {
      // Apply search and filter
      cy.get('[data-testid="input-search-documents"]').type('API');
      cy.get('[role="combobox"]').last().click();
      cy.get('[role="option"]').contains('Documentation').click();
      
      // Clear filters
      cy.get('button').contains('Clear').click();
      
      // Should show all articles
      cy.contains('JavaScript Tutorial').should('be.visible');
      cy.contains('API Documentation').should('be.visible');
      cy.contains('Project Setup').should('be.visible');
    });
  });

  describe('Responsive Design', () => {
    const viewports = [
      { width: 320, height: 568, name: 'Mobile Small' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1024, height: 768, name: 'Desktop Small' },
      { width: 1440, height: 900, name: 'Desktop Large' }
    ];

    viewports.forEach(viewport => {
      it(`should work properly on ${viewport.name} (${viewport.width}x${viewport.height})`, () => {
        cy.viewport(viewport.width, viewport.height);
        
        // Check that create button is accessible
        const createButton = viewport.width < 768 
          ? '[data-testid="fab-create-article"]' 
          : '[data-testid="button-create-article"]';
          
        cy.get(createButton).should('be.visible').click();
        
        // Form should be responsive
        cy.get('input[id="query"]').should('be.visible');
        cy.get('textarea[id="content"]').should('be.visible');
        
        // Close modal
        cy.get('button').contains('Cancel').click();
        
        // Grid should be responsive
        cy.get('[data-testid^="knowledge-card-"]').should('be.visible');
      });
    });
  });
});

export {}; // Make this a module