The plugin is installed into the repo via the rush-plugins installer

Use the integration-test projects setup under packages/integration-test-projects

ie to test a combined rename, move, referenced symbol refactoring this would be the command you execute `rush refactor --from @test/source --rename b,c --move b,@test/consumer-b`